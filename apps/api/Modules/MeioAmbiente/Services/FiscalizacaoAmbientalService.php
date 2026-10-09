<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ParcelaMulta;
use Modules\MeioAmbiente\Models\ParcelamentoMulta;
use Modules\MeioAmbiente\Models\TabelaMultaAmbiental;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\DocumentoService;

/**
 * Emissão de autos de infração ambiental e parcelamento da multa aplicada —
 * reaproveita inteiramente a emissão de documento, assinatura em tela e processo
 * administrativo sancionatório do módulo Vistoria (`DocumentoService`,
 * `ProcessoSancionatorio`), sem duplicar essa máquina de estados. Ver design.md
 * (decisões D3 e D4) e spec `meio-ambiente/fiscalizacao-ambiental`.
 */
final readonly class FiscalizacaoAmbientalService
{
    public function __construct(
        private DocumentoService $documentos,
        private IntegracaoMeioAmbienteService $integracoes,
        private AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     tipo_infracao: string,
     *     area_afetada_ha?: float|null,
     *     irregularidade?: string|null,
     *     enquadramento_legal?: string|null,
     *     prazo_dias?: int|null,
     * } $dados
     */
    public function emitirAutoInfracaoAmbiental(ExecucaoVistoria $execucao, Empreendimento $empreendimento, array $dados): AutoInfracaoAmbiental
    {
        $tipoInfracao = $dados['tipo_infracao'];
        $reincidente = $this->identificarReincidencia($empreendimento, $tipoInfracao);

        $documento = $this->documentos->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, [
            'irregularidade' => $dados['irregularidade'] ?? null,
            'enquadramento_legal' => $dados['enquadramento_legal'] ?? null,
            'prazo_dias' => $dados['prazo_dias'] ?? null,
        ]);

        $auto = AutoInfracaoAmbiental::create([
            'documento_id' => $documento->id,
            'empreendimento_id' => $empreendimento->id,
            'tipo_infracao' => $tipoInfracao,
            'area_afetada_ha' => $dados['area_afetada_ha'] ?? null,
            'reincidente' => $reincidente,
        ]);

        $auto->valor_multa_sugerido_centavos = $this->calcularMultaSugerida($auto);
        $auto->save();
        $this->audit->record('meio_ambiente', 'auto_infracao.emitido', "AutoInfracaoAmbiental #{$auto->id} (Documento #{$documento->id})", null, $auto->toArray());

        $this->integracoes->agendarEnvioAutoInfracao($auto);

        return $auto;
    }

    /**
     * Valor sugerido — o julgador do processo sancionatório (Vistoria) pode aplicar
     * valor diferente ao julgar; o valor sugerido fica só como referência histórica
     * em `AutoInfracaoAmbiental::$valor_multa_sugerido_centavos`.
     */
    public function calcularMultaSugerida(AutoInfracaoAmbiental $autoInfracao): int
    {
        $tabela = TabelaMultaAmbiental::where('tipo_infracao', $autoInfracao->tipo_infracao)->firstOrFail();

        $valor = $tabela->criterio === TabelaMultaAmbiental::CRITERIO_POR_HECTARE
            ? (int) round($tabela->valor_base_centavos * (float) $autoInfracao->area_afetada_ha)
            : $tabela->valor_base_centavos;

        if ($autoInfracao->reincidente) {
            $valor += (int) round($valor * $tabela->agravante_reincidencia_percentual / 100);
        }

        return $valor;
    }

    public function parcelar(ProcessoSancionatorio $processo, int $numeroParcelas): ParcelamentoMulta
    {
        if ($numeroParcelas < 1 || $numeroParcelas > ParcelamentoMulta::LIMITE_PARCELAS) {
            throw new RegraNegocioException(
                'limite_parcelas_excedido',
                'Número de parcelas excede o limite permitido.',
            );
        }

        if ($processo->penalidade_centavos === null) {
            throw new RegraNegocioException(
                'sem_penalidade_aplicada',
                'Processo sem penalidade aplicada não pode ser parcelado.',
            );
        }

        $total = $processo->penalidade_centavos;

        return DB::transaction(function () use ($processo, $numeroParcelas, $total): ParcelamentoMulta {
            $parcelamento = ParcelamentoMulta::create([
                'processo_sancionatorio_id' => $processo->id,
                'numero_parcelas' => $numeroParcelas,
                'valor_total_centavos' => $total,
            ]);

            $acumuladoAnterior = 0;
            for ($numero = 1; $numero <= $numeroParcelas; $numero++) {
                $acumulado = intdiv($total * $numero, $numeroParcelas);

                ParcelaMulta::create([
                    'parcelamento_id' => $parcelamento->id,
                    'numero' => $numero,
                    'valor_centavos' => $acumulado - $acumuladoAnterior,
                    'vencimento' => now()->addMonths($numero)->toDateString(),
                ]);

                $acumuladoAnterior = $acumulado;
            }

            $this->audit->record('meio_ambiente', 'multa.parcelada', "ParcelamentoMulta #{$parcelamento->id} (ProcessoSancionatorio #{$processo->id})", null, $parcelamento->load('parcelas')->toArray());

            return $parcelamento;
        });
    }

    /**
     * Baixa de uma parcela da multa. Pagamento à vista é um parcelamento de 1 parcela —
     * é essa baixa que alimenta o indicador de multas arrecadadas do painel (Fase 10).
     */
    public function registrarPagamentoParcela(ParcelaMulta $parcela): ParcelaMulta
    {
        if ($parcela->pago) {
            throw new RegraNegocioException('parcela_ja_paga', 'Parcela já está paga.');
        }

        $antes = $parcela->toArray();
        $parcela->update(['pago' => true, 'pago_em' => now()]);
        $this->audit->record('meio_ambiente', 'parcela_multa.paga', "ParcelaMulta #{$parcela->id} (ParcelamentoMulta #{$parcela->parcelamento_id})", $antes, $parcela->toArray());

        return $parcela;
    }

    /**
     * Reincidência: mesmo titular (pessoa física ou CNPJ) com outro auto de infração
     * ambiental do mesmo tipo já penalizado nos últimos 24 meses — ver
     * `AutoInfracaoAmbiental::JANELA_REINCIDENCIA_MESES`.
     */
    private function identificarReincidencia(Empreendimento $empreendimento, string $tipoInfracao): bool
    {
        $empreendimentoIds = Empreendimento::query()
            ->where(function ($query) use ($empreendimento): void {
                if ($empreendimento->titular_pessoa_id !== null) {
                    $query->orWhere('titular_pessoa_id', $empreendimento->titular_pessoa_id);
                }
                if ($empreendimento->cnpj !== null) {
                    $query->orWhere('cnpj', $empreendimento->cnpj);
                }
            })
            ->pluck('id');

        if ($empreendimentoIds->isEmpty()) {
            return false;
        }

        $limite = now()->subMonths(AutoInfracaoAmbiental::JANELA_REINCIDENCIA_MESES);

        return AutoInfracaoAmbiental::query()
            ->whereIn('empreendimento_id', $empreendimentoIds)
            ->where('tipo_infracao', $tipoInfracao)
            ->whereHas('documento.processoSancionatorio', function ($query) use ($limite): void {
                $query->whereNotNull('penalidade_centavos')->where('julgado_em', '>=', $limite);
            })
            ->exists();
    }
}

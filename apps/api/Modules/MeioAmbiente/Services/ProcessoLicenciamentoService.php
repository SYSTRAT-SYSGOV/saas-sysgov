<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\MeioAmbiente\Models\AlertaLicenciamento;
use Modules\MeioAmbiente\Models\Condicionante;
use Modules\MeioAmbiente\Models\Contador;
use Modules\MeioAmbiente\Models\DocumentoLicenciamento;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/** Abertura, instrução e deferimento de processos de licenciamento ambiental por fase. */
final readonly class ProcessoLicenciamentoService
{
    /** Documentos obrigatórios por fase quando o porte do empreendimento exige — ver design.md D-licenciamento. */
    private const DOCUMENTOS_EXIGIDOS_POR_FASE_E_PORTE = [
        ProcessoLicenciamento::FASE_LP => [Empreendimento::PORTE_GRANDE => [DocumentoLicenciamento::TIPO_EIA_RIMA]],
    ];

    private const RETULOS_TIPO_DOCUMENTO = [
        DocumentoLicenciamento::TIPO_EIA_RIMA => 'EIA/RIMA',
    ];

    private const DIAS_LIMITE_RENOVACAO = 120;

    /** @var list<int> */
    private const LIMIARES_ALERTA_DIAS = [90, 30, 7];

    public function __construct(
        private EmpreendimentoService $empreendimentos,
        private CompensacaoAmbientalService $compensacoes,
        private TenantContext $tenantContext,
        private AuditLogger $audit,
    ) {}

    public function abrirProcesso(Empreendimento $empreendimento, string $fase): ProcessoLicenciamento
    {
        $this->empreendimentos->garantirResponsavelTecnico($empreendimento);

        if ($fase === ProcessoLicenciamento::FASE_RENOVACAO) {
            $this->garantirRenovacaoDentroDoPrazo($empreendimento);
        }

        $this->garantirSemCondicionantePendenteDaFaseAnterior($empreendimento, $fase);

        $tenantId = $this->tenantContext->id();
        $exercicio = (int) now()->year;
        $sequencial = Contador::proximoValor($tenantId, "processo_licenciamento:{$fase}", $exercicio);

        $processo = ProcessoLicenciamento::create([
            'empreendimento_id' => $empreendimento->id,
            'fase' => $fase,
            'numero' => sprintf('%s/%d/%04d', $fase, $exercicio, $sequencial),
            'numero_sequencial' => $sequencial,
            'exercicio' => $exercicio,
            'status' => ProcessoLicenciamento::STATUS_EM_ANALISE,
        ]);
        $this->audit->record('meio_ambiente', 'processo_licenciamento.aberto', "ProcessoLicenciamento #{$processo->id} (Empreendimento #{$empreendimento->id})", null, $processo->toArray());

        return $processo;
    }

    public function anexarDocumento(ProcessoLicenciamento $processo, string $tipo, ?UploadedFile $arquivo = null): DocumentoLicenciamento
    {
        $caminho = $arquivo?->store('meio-ambiente/licenciamento', 'public');

        $documento = DocumentoLicenciamento::create([
            'processo_licenciamento_id' => $processo->id,
            'tipo' => $tipo,
            'caminho_arquivo' => $caminho,
            'anexado_em' => now(),
        ]);
        $this->audit->record('meio_ambiente', 'processo_licenciamento.documento_anexado', "DocumentoLicenciamento #{$documento->id} (ProcessoLicenciamento #{$processo->id})", null, $documento->toArray());

        return $documento;
    }

    /** @return list<string> rótulos dos documentos obrigatórios ainda pendentes */
    public function documentosObrigatoriosPendentes(ProcessoLicenciamento $processo): array
    {
        $exigidos = self::DOCUMENTOS_EXIGIDOS_POR_FASE_E_PORTE[$processo->fase][$processo->empreendimento->porte] ?? [];

        if ($exigidos === []) {
            return [];
        }

        $anexados = $processo->documentos()->pluck('tipo')->all();
        $pendentes = array_diff($exigidos, $anexados);

        return array_map(
            // @phpstan-ignore nullCoalesce.offset (só é sempre encontrado hoje porque RETULOS_TIPO_DOCUMENTO tem 1 entrada — crescerá com novos tipos de documento)
            static fn (string $tipo): string => self::RETULOS_TIPO_DOCUMENTO[$tipo] ?? $tipo,
            array_values($pendentes),
        );
    }

    /** @param array{descricao: string, prazo: string} $dados */
    public function registrarCondicionante(ProcessoLicenciamento $processo, array $dados): Condicionante
    {
        $condicionante = Condicionante::create([
            'processo_licenciamento_id' => $processo->id,
            'descricao' => $dados['descricao'],
            'prazo' => $dados['prazo'],
            'situacao' => Condicionante::SITUACAO_PENDENTE,
        ]);
        $this->audit->record('meio_ambiente', 'condicionante.registrada', $this->recursoCondicionante($condicionante), null, $condicionante->toArray());

        return $condicionante;
    }

    public function marcarCondicionanteCumprida(Condicionante $condicionante): Condicionante
    {
        $antes = $condicionante->toArray();
        $condicionante->update(['situacao' => Condicionante::SITUACAO_CUMPRIDA, 'cumprida_em' => now()]);
        $this->audit->record('meio_ambiente', 'condicionante.cumprida', $this->recursoCondicionante($condicionante), $antes, $condicionante->toArray());

        return $condicionante;
    }

    /** @param array{resultado: string, parecer?: string|null} $dados */
    public function registrarVistoriaTecnica(ProcessoLicenciamento $processo, array $dados): VistoriaTecnicaLicenciamento
    {
        $vistoria = VistoriaTecnicaLicenciamento::create([
            'processo_licenciamento_id' => $processo->id,
            'resultado' => $dados['resultado'],
            'parecer' => $dados['parecer'] ?? null,
            'realizada_em' => now(),
        ]);
        $this->audit->record('meio_ambiente', 'processo_licenciamento.vistoria_tecnica_registrada', "VistoriaTecnicaLicenciamento #{$vistoria->id} (ProcessoLicenciamento #{$processo->id})", null, $vistoria->toArray());

        return $vistoria;
    }

    public function deferir(ProcessoLicenciamento $processo, ?string $justificativaParecerDesfavoravel = null): ProcessoLicenciamento
    {
        $pendentes = $this->documentosObrigatoriosPendentes($processo);
        if ($pendentes !== []) {
            throw new RegraNegocioException(
                'documento_pendente',
                "Documento obrigatório pendente: {$pendentes[0]}",
            );
        }

        $ultimaVistoria = $processo->ultimaVistoriaTecnica();
        if ($ultimaVistoria !== null
            && $ultimaVistoria->resultado === VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL
            && $justificativaParecerDesfavoravel === null
        ) {
            throw new RegraNegocioException(
                'parecer_desfavoravel',
                'Parecer técnico desfavorável — deferimento requer justificativa expressa.',
            );
        }

        if ($processo->fase === ProcessoLicenciamento::FASE_LO
            && $this->compensacoes->empreendimentoTemSaldoPendente($processo->empreendimento)
        ) {
            throw new RegraNegocioException(
                'compensacao_pendente',
                'Compensação ambiental com saldo pendente impede emissão da licença.',
            );
        }

        $dataDeferimento = today();
        $validadeDias = ProcessoLicenciamento::VALIDADE_DIAS_POR_FASE[$processo->fase];

        $antes = $processo->toArray();
        $processo->update([
            'status' => ProcessoLicenciamento::STATUS_DEFERIDO,
            'data_deferimento' => $dataDeferimento,
            'validade_em' => $dataDeferimento->copy()->addDays($validadeDias),
        ]);

        $this->audit->record('meio_ambiente', 'processo_licenciamento.deferido', "ProcessoLicenciamento #{$processo->id}", $antes, $processo->toArray());

        $this->compensacoes->criarSeNecessario($processo);

        return $processo;
    }

    private function recursoCondicionante(Condicionante $condicionante): string
    {
        return "Condicionante #{$condicionante->id} (ProcessoLicenciamento #{$condicionante->processo_licenciamento_id})";
    }

    /**
     * Roda diariamente (ver `Modules\MeioAmbiente\Console\VerificarPrazosLicenciamentoCommand`):
     * gera alerta aos 90/30/7 dias do vencimento de cada licença deferida.
     */
    public function verificarPrazos(): int
    {
        $alertasGerados = 0;

        ProcessoLicenciamento::query()
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->whereNotNull('validade_em')
            ->each(function (ProcessoLicenciamento $processo) use (&$alertasGerados): void {
                $diasRestantes = (int) today()->diffInDays($processo->validade_em, false);

                if (! in_array($diasRestantes, self::LIMIARES_ALERTA_DIAS, true)) {
                    return;
                }

                $alerta = AlertaLicenciamento::firstOrCreate(
                    [
                        'tenant_id' => $processo->tenant_id,
                        'processo_licenciamento_id' => $processo->id,
                        'dias_para_vencimento' => $diasRestantes,
                    ],
                    ['gerado_em' => now()],
                );

                if ($alerta->wasRecentlyCreated) {
                    $alertasGerados++;
                }
            });

        return $alertasGerados;
    }

    /**
     * Empreendimento é "irregular" quando sua última Licença de Operação deferida
     * está vencida e não há processo de renovação aberto/deferido desde então —
     * ver spec `meio-ambiente/licenciamento`, cenário "Licença vencida sem renovação".
     */
    public function empreendimentoEstaIrregular(Empreendimento $empreendimento): bool
    {
        $ultimaLo = ProcessoLicenciamento::query()
            ->where('empreendimento_id', $empreendimento->id)
            ->where('fase', ProcessoLicenciamento::FASE_LO)
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->latest('data_deferimento')
            ->first();

        if ($ultimaLo === null || ! $ultimaLo->estaVencido()) {
            return false;
        }

        $renovacaoAposVencimento = ProcessoLicenciamento::query()
            ->where('empreendimento_id', $empreendimento->id)
            ->where('fase', ProcessoLicenciamento::FASE_RENOVACAO)
            ->where('created_at', '>=', $ultimaLo->validade_em)
            ->exists();

        return ! $renovacaoAposVencimento;
    }

    private function garantirRenovacaoDentroDoPrazo(Empreendimento $empreendimento): void
    {
        $ultimaLo = ProcessoLicenciamento::query()
            ->where('empreendimento_id', $empreendimento->id)
            ->where('fase', ProcessoLicenciamento::FASE_LO)
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->latest('data_deferimento')
            ->first();

        if ($ultimaLo === null || $ultimaLo->validade_em === null) {
            throw new RegraNegocioException(
                'licenca_operacao_inexistente',
                'Nenhuma Licença de Operação deferida foi encontrada para renovação.',
            );
        }

        if ($ultimaLo->validade_em->copy()->addDays(self::DIAS_LIMITE_RENOVACAO)->isPast()) {
            throw new RegraNegocioException(
                'renovacao_expirada',
                'Prazo de renovação expirado — novo licenciamento completo é necessário.',
            );
        }
    }

    private function garantirSemCondicionantePendenteDaFaseAnterior(Empreendimento $empreendimento, string $fase): void
    {
        $indice = array_search($fase, ProcessoLicenciamento::ORDEM_FASES_PRINCIPAIS, true);
        if ($indice === false || $indice === 0) {
            return;
        }

        $faseAnterior = ProcessoLicenciamento::ORDEM_FASES_PRINCIPAIS[$indice - 1];

        $processoAnterior = ProcessoLicenciamento::query()
            ->where('empreendimento_id', $empreendimento->id)
            ->where('fase', $faseAnterior)
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->latest('data_deferimento')
            ->first();

        if ($processoAnterior !== null && $processoAnterior->temCondicionantePendenteVencida()) {
            throw new RegraNegocioException(
                'condicionante_pendente',
                'Condicionante pendente impede avanço de fase.',
            );
        }
    }
}

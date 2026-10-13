<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Support\AuditLogger;
use Modules\MeioAmbiente\Models\AlertaRecursoHidrico;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\LicencaLancamentoEfluente;
use Modules\MeioAmbiente\Models\MedicaoEfluente;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Models\ParametroQualidadeEfluente;

/**
 * Outorgas de uso da água e licenças de lançamento de efluentes, com parâmetros
 * de qualidade e alerta de vencimento — ver spec `meio-ambiente/recursos-hidricos`.
 */
final readonly class RecursosHidricosService
{
    /** @var list<int> */
    private const LIMIARES_ALERTA_DIAS = [90, 30, 7];

    public function __construct(private AuditLogger $audit) {}

    /** @param array{tipo_captacao: string, vazao_m3_hora: float, finalidade: string} $dados */
    public function cadastrarOutorga(Empreendimento $empreendimento, array $dados): OutorgaAgua
    {
        $outorga = OutorgaAgua::create($dados + [
            'empreendimento_id' => $empreendimento->id,
            'validade_em' => today()->addDays(OutorgaAgua::VALIDADE_DIAS),
        ]);
        $this->audit->record('meio_ambiente', 'outorga_agua.cadastrada', "OutorgaAgua #{$outorga->id} (Empreendimento #{$empreendimento->id})", null, $outorga->toArray());

        return $outorga;
    }

    /**
     * @param list<array{parametro: string, limite_min?: float|null, limite_max?: float|null, unidade?: string|null}> $parametros
     */
    public function cadastrarLicencaEfluente(Empreendimento $empreendimento, array $parametros): LicencaLancamentoEfluente
    {
        $licenca = LicencaLancamentoEfluente::create([
            'empreendimento_id' => $empreendimento->id,
            'validade_em' => today()->addDays(LicencaLancamentoEfluente::VALIDADE_DIAS),
        ]);

        foreach ($parametros as $parametro) {
            $licenca->parametros()->create($parametro);
        }
        $this->audit->record('meio_ambiente', 'licenca_efluente.cadastrada', "LicencaLancamentoEfluente #{$licenca->id} (Empreendimento #{$empreendimento->id})", null, $licenca->load('parametros')->toArray());

        return $licenca;
    }

    /** @param array{valor: float, medida_em?: string} $dados */
    public function registrarMedicao(ParametroQualidadeEfluente $parametro, array $dados): MedicaoEfluente
    {
        $medicao = MedicaoEfluente::create([
            'parametro_qualidade_efluente_id' => $parametro->id,
            'valor' => $dados['valor'],
            'medida_em' => $dados['medida_em'] ?? now(),
            'conforme' => $parametro->dentroDoLimite((float) $dados['valor']),
        ]);
        $this->audit->record('meio_ambiente', 'medicao_efluente.registrada', "MedicaoEfluente #{$medicao->id} (ParametroQualidadeEfluente #{$parametro->id})", null, $medicao->toArray());

        return $medicao;
    }

    /**
     * Roda diariamente: gera alerta aos 90/30/7 dias do vencimento de outorgas e
     * licenças de lançamento de efluentes — ver spec, cenário "alerta gerado 90 dias
     * antes do vencimento da outorga".
     */
    public function verificarPrazos(): int
    {
        $gerados = 0;

        foreach (OutorgaAgua::query()->get() as $outorga) {
            $gerados += $this->gerarAlertaSeNoLimiar($outorga->tenant_id, AlertaRecursoHidrico::TIPO_OUTORGA_AGUA, $outorga->id, $outorga->validade_em);
        }

        foreach (LicencaLancamentoEfluente::query()->get() as $licenca) {
            $gerados += $this->gerarAlertaSeNoLimiar($licenca->tenant_id, AlertaRecursoHidrico::TIPO_LICENCA_EFLUENTE, $licenca->id, $licenca->validade_em);
        }

        return $gerados;
    }

    private function gerarAlertaSeNoLimiar(int $tenantId, string $tipoReferencia, int $referenciaId, \Illuminate\Support\Carbon $validadeEm): int
    {
        $diasRestantes = (int) today()->diffInDays($validadeEm, false);

        if (! in_array($diasRestantes, self::LIMIARES_ALERTA_DIAS, true)) {
            return 0;
        }

        $alerta = AlertaRecursoHidrico::firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'tipo_referencia' => $tipoReferencia,
                'referencia_id' => $referenciaId,
                'dias_para_vencimento' => $diasRestantes,
            ],
            ['gerado_em' => now()],
        );

        return $alerta->wasRecentlyCreated ? 1 : 0;
    }
}

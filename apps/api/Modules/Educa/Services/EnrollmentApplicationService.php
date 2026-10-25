<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaEnrollmentApplication;
use Modules\Educa\Models\EducaSchool;
use Modules\Pessoas\Models\Pessoa;

/**
 * Gestão de Inscrições de Pré-Matrícula e Pontuação Socioeconômica.
 */
final class EnrollmentApplicationService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     status?: string|null,
     *     etapa_ensino?: string|null,
     *     school_id?: string|null,
     *     candidato_pessoa_id?: int|string|null
     * } $filtros
     * @return Collection<int, EducaEnrollmentApplication>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaEnrollmentApplication::query()
            ->with([
                'candidato',
                'responsavel',
                'academicYear',
                'escolaPreferencia1',
                'escolaPreferencia2',
                'escolaPreferencia3',
                'analisador',
            ])
            ->orderByDesc('created_at');

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['etapa_ensino'])) {
            $query->where('etapa_ensino', $filtros['etapa_ensino']);
        }

        if (! empty($filtros['candidato_pessoa_id'])) {
            $query->where('candidato_pessoa_id', $filtros['candidato_pessoa_id']);
        }

        if (! empty($filtros['school_id'])) {
            $query->where(function ($q) use ($filtros) {
                $q->where('escola_preferencia_1_id', $filtros['school_id'])
                    ->orWhere('escola_preferencia_2_id', $filtros['school_id'])
                    ->orWhere('escola_preferencia_3_id', $filtros['school_id']);
            });
        }

        return $query->get();
    }

    public function obter(string $applicationId): EducaEnrollmentApplication
    {
        return EducaEnrollmentApplication::query()
            ->with([
                'candidato',
                'responsavel',
                'academicYear',
                'escolaPreferencia1',
                'escolaPreferencia2',
                'escolaPreferencia3',
                'analisador',
                'waitlistEntries',
            ])
            ->findOrFail($applicationId);
    }

    /**
     * Registra nova solicitação de pré-matrícula escolar com geração de protocolo anual.
     *
     * @param array{
     *     academic_year_id: string,
     *     candidato_pessoa_id: int|string,
     *     responsavel_pessoa_id: int|string,
     *     etapa_ensino: string,
     *     turno_preferencial?: string|null,
     *     escola_preferencia_1_id: string,
     *     escola_preferencia_2_id?: string|null,
     *     escola_preferencia_3_id?: string|null,
     *     criterio_pcd?: bool|null,
     *     criterio_bolsa_familia?: bool|null,
     *     criterio_mae_trabalhadora?: bool|null,
     *     criterio_irmao_escola?: bool|null,
     *     criterio_zoneamento?: bool|null
     * } $dados
     */
    public function criar(array $dados, int $tenantId): EducaEnrollmentApplication
    {
        $candidato = Pessoa::findOrFail($dados['candidato_pessoa_id']);
        $responsavel = Pessoa::findOrFail($dados['responsavel_pessoa_id']);
        $ano = EducaAcademicYear::findOrFail($dados['academic_year_id']);
        $escola1 = EducaSchool::findOrFail($dados['escola_preferencia_1_id']);

        // Validação da data corte do MEC (31 de março do ano letivo)
        if ($candidato->data_nascimento) {
            $nascimento = Carbon::parse($candidato->data_nascimento);
            $anoReferencia = $ano->ano;
            $dataCorte = Carbon::createFromDate($anoReferencia, 3, 31);
            $idadeNaDataCorte = $nascimento->diffInYears($dataCorte);

            // Validação preliminar para creche (0 a 3 anos) vs pré-escola (4 a 5 anos)
            if ($dados['etapa_ensino'] === 'creche_bercario' && $idadeNaDataCorte > 1) {
                throw new InvalidArgumentException('O candidato possui idade superior ao limite para a etapa de berçário.');
            }
        }

        // Calcula a pontuação inicial
        $pontuacao = $this->calcularPontuacao([
            'criterio_pcd' => (bool) ($dados['criterio_pcd'] ?? false),
            'criterio_bolsa_familia' => (bool) ($dados['criterio_bolsa_familia'] ?? false),
            'criterio_mae_trabalhadora' => (bool) ($dados['criterio_mae_trabalhadora'] ?? false),
            'criterio_irmao_escola' => (bool) ($dados['criterio_irmao_escola'] ?? false),
            'criterio_zoneamento' => (bool) ($dados['criterio_zoneamento'] ?? false),
        ]);

        return DB::transaction(function () use ($dados, $tenantId, $ano, $candidato, $responsavel, $escola1, $pontuacao): EducaEnrollmentApplication {
            // Gera número sequencial de protocolo atômico
            $anoAtual = $ano->ano;
            $totalAno = EducaEnrollmentApplication::query()
                ->where('tenant_id', $tenantId)
                ->where('academic_year_id', $ano->id)
                ->lockForUpdate()
                ->count();

            $sequencial = str_pad((string) ($totalAno + 1), 5, '0', STR_PAD_LEFT);
            $protocolo = "VAGA-{$anoAtual}-{$sequencial}";

            $application = EducaEnrollmentApplication::create([
                'tenant_id' => $tenantId,
                'academic_year_id' => $ano->id,
                'numero_protocolo' => $protocolo,
                'candidato_pessoa_id' => $candidato->id,
                'responsavel_pessoa_id' => $responsavel->id,
                'etapa_ensino' => $dados['etapa_ensino'],
                'turno_preferencial' => $dados['turno_preferencial'] ?? 'matutino',
                'escola_preferencia_1_id' => $escola1->id,
                'escola_preferencia_2_id' => $dados['escola_preferencia_2_id'] ?? null,
                'escola_preferencia_3_id' => $dados['escola_preferencia_3_id'] ?? null,
                'status' => 'inscrito',
                'criterio_pcd' => (bool) ($dados['criterio_pcd'] ?? false),
                'criterio_bolsa_familia' => (bool) ($dados['criterio_bolsa_familia'] ?? false),
                'criterio_mae_trabalhadora' => (bool) ($dados['criterio_mae_trabalhadora'] ?? false),
                'criterio_irmao_escola' => (bool) ($dados['criterio_irmao_escola'] ?? false),
                'criterio_zoneamento' => (bool) ($dados['criterio_zoneamento'] ?? false),
                'pontuacao_total' => $pontuacao,
            ]);

            $this->audit->record(
                'educa',
                'create',
                "educa_enrollment_application:{$application->id}",
                null,
                $application->toArray()
            );

            return $application->load([
                'candidato',
                'responsavel',
                'academicYear',
                'escolaPreferencia1',
            ]);
        });
    }

    /**
     * Análise documental de critérios socioeconômicos e deferimento/indeferimento de pré-matrícula.
     *
     * @param array{
     *     status: string,
     *     criterio_pcd_validado?: bool|null,
     *     criterio_bolsa_familia_validado?: bool|null,
     *     criterio_mae_trabalhadora_validado?: bool|null,
     *     criterio_irmao_escola_validado?: bool|null,
     *     criterio_zoneamento_validado?: bool|null,
     *     observacoes_analise?: string|null
     * } $dados
     */
    public function analisar(string $applicationId, array $dados, int $userId): EducaEnrollmentApplication
    {
        $application = $this->obter($applicationId);
        $anterior = $application->toArray();

        $criterioPcd = isset($dados['criterio_pcd_validado']) ? (bool) $dados['criterio_pcd_validado'] : $application->criterio_pcd;
        $criterioBolsa = isset($dados['criterio_bolsa_familia_validado']) ? (bool) $dados['criterio_bolsa_familia_validado'] : $application->criterio_bolsa_familia;
        $criterioMae = isset($dados['criterio_mae_trabalhadora_validado']) ? (bool) $dados['criterio_mae_trabalhadora_validado'] : $application->criterio_mae_trabalhadora;
        $criterioIrmao = isset($dados['criterio_irmao_escola_validado']) ? (bool) $dados['criterio_irmao_escola_validado'] : $application->criterio_irmao_escola;
        $criterioZoneamento = isset($dados['criterio_zoneamento_validado']) ? (bool) $dados['criterio_zoneamento_validado'] : $application->criterio_zoneamento;

        $novaPontuacao = $this->calcularPontuacao([
            'criterio_pcd' => $criterioPcd,
            'criterio_bolsa_familia' => $criterioBolsa,
            'criterio_mae_trabalhadora' => $criterioMae,
            'criterio_irmao_escola' => $criterioIrmao,
            'criterio_zoneamento' => $criterioZoneamento,
        ]);

        $application->update([
            'status' => $dados['status'],
            'criterio_pcd' => $criterioPcd,
            'criterio_bolsa_familia' => $criterioBolsa,
            'criterio_mae_trabalhadora' => $criterioMae,
            'criterio_irmao_escola' => $criterioIrmao,
            'criterio_zoneamento' => $criterioZoneamento,
            'pontuacao_total' => $novaPontuacao,
            'observacoes_analise' => $dados['observacoes_analise'] ?? $application->observacoes_analise,
            'analisado_por' => $userId,
            'analisado_em' => Carbon::now(),
        ]);

        $this->audit->record(
            'educa',
            'analisar_inscricao',
            "educa_enrollment_application:{$application->id}",
            $anterior,
            $application->toArray()
        );

        return $application->fresh([
            'candidato',
            'responsavel',
            'academicYear',
            'escolaPreferencia1',
            'analisador',
        ]);
    }

    /**
     * Calcula a pontuação ponderada conforme diretrizes municipais.
     *
     * @param array{
     *     criterio_pcd: bool,
     *     criterio_bolsa_familia: bool,
     *     criterio_mae_trabalhadora: bool,
     *     criterio_irmao_escola: bool,
     *     criterio_zoneamento: bool
     * } $criterios
     */
    public function calcularPontuacao(array $criterios): int
    {
        $pontos = 0;

        // PcD / Necessidades especiais: Prioridade legal absoluta (1000 pontos)
        if ($criterios['criterio_pcd']) {
            $pontos += 1000;
        }

        // Beneficiário do CadÚnico / Bolsa Família: 100 pontos
        if ($criterios['criterio_bolsa_familia']) {
            $pontos += 100;
        }

        // Mãe trabalhadora comprovada: 50 pontos
        if ($criterios['criterio_mae_trabalhadora']) {
            $pontos += 50;
        }

        // Irmão na mesma unidade escolar: 30 pontos
        if ($criterios['criterio_irmao_escola']) {
            $pontos += 30;
        }

        // Proximidade residencial (zoneamento de CEP): 20 pontos
        if ($criterios['criterio_zoneamento']) {
            $pontos += 20;
        }

        return $pontos;
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Educa\Models\EducaEnrollmentApplication;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaWaitlist;

/**
 * Motor de Classificação da Fila de Espera Escolar e Portal de Transparência (Lei 14.685/2023).
 */
final class WaitlistRankingService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id: string,
     *     etapa_ensino: string,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaWaitlist>
     */
    public function listarFila(array $filtros): Collection
    {
        $query = EducaWaitlist::query()
            ->with(['application.candidato', 'application.responsavel', 'school'])
            ->where('school_id', $filtros['school_id'])
            ->where('etapa_ensino', $filtros['etapa_ensino'])
            ->orderBy('posicao');

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->get();
    }

    /**
     * Enfileira uma solicitação de inscrição nas escolas de preferência.
     */
    public function enfileirar(EducaEnrollmentApplication $application): void
    {
        DB::transaction(function () use ($application): void {
            $escolasIds = array_filter([
                $application->escola_preferencia_1_id,
                $application->escola_preferencia_2_id,
                $application->escola_preferencia_3_id,
            ]);

            foreach ($escolasIds as $schoolId) {
                // Verifica se já não está enfileirado
                $jaExiste = EducaWaitlist::query()
                    ->where('application_id', $application->id)
                    ->where('school_id', $schoolId)
                    ->exists();

                if (! $jaExiste) {
                    EducaWaitlist::create([
                        'tenant_id' => $application->tenant_id,
                        'application_id' => $application->id,
                        'school_id' => $schoolId,
                        'etapa_ensino' => $application->etapa_ensino,
                        'turno' => $application->turno_preferencial,
                        'posicao' => 99999, // Provisório até reclassificação
                        'prioridade_legal' => $application->criterio_pcd,
                        'pontuacao' => $application->pontuacao_total,
                        'status' => 'aguardando',
                    ]);

                    $this->reclassificarFila($schoolId, $application->etapa_ensino);
                }
            }
        });
    }

    /**
     * Reclassifica toda a fila de espera da escola e etapa de ensino.
     * Ordenação:
     * 1. prioridade_legal (PcD primeiro)
     * 2. pontuacao (decrescente)
     * 3. data de criação da inscrição (critério cronológico de desempate)
     */
    public function reclassificarFila(string $schoolId, string $etapaEnsino): int
    {
        return DB::transaction(function () use ($schoolId, $etapaEnsino): int {
            $inscritos = EducaWaitlist::query()
                ->where('educa_waitlists.school_id', $schoolId)
                ->where('educa_waitlists.etapa_ensino', $etapaEnsino)
                ->whereIn('educa_waitlists.status', ['aguardando', 'convocado'])
                ->join('educa_enrollment_applications', 'educa_waitlists.application_id', '=', 'educa_enrollment_applications.id')
                ->orderByDesc('educa_waitlists.prioridade_legal')
                ->orderByDesc('educa_waitlists.pontuacao')
                ->orderBy('educa_enrollment_applications.created_at')
                ->select('educa_waitlists.*')
                ->lockForUpdate()
                ->get();

            $posicao = 1;
            foreach ($inscritos as $waitlist) {
                if ($waitlist->posicao !== $posicao) {
                    $waitlist->update(['posicao' => $posicao]);
                }
                $posicao++;
            }

            return $inscritos->count();
        });
    }

    /**
     * Lista a fila de espera para consulta pública anonimizada (Lei 14.685/2023).
     *
     * @param array{
     *     school_id: string,
     *     etapa_ensino: string,
     *     numero_protocolo?: string|null
     * } $filtros
     * @return array<int, array<string, mixed>>
     */
    public function listarConsultaPublica(array $filtros): array
    {
        $query = EducaWaitlist::query()
            ->with(['application.candidato'])
            ->where('school_id', $filtros['school_id'])
            ->where('etapa_ensino', $filtros['etapa_ensino'])
            ->orderBy('posicao');

        if (! empty($filtros['numero_protocolo'])) {
            $query->whereHas('application', function ($q) use ($filtros) {
                $q->where('numero_protocolo', $filtros['numero_protocolo']);
            });
        }

        return $query->get()->map(function (EducaWaitlist $item) {
            $candidatoNome = $item->application?->candidato?->nome ?? 'Candidato';
            return [
                'posicao' => $item->posicao,
                'numero_protocolo' => $item->application?->numero_protocolo,
                'candidato_anonimizado' => $this->mascararNome($candidatoNome),
                'etapa_ensino' => $item->etapa_ensino,
                'pontuacao' => $item->pontuacao,
                'prioridade_legal' => (bool) $item->prioridade_legal,
                'status' => $item->status,
                'limite_comparecimento_em' => $item->limite_comparecimento_em?->format('d/m/Y'),
            ];
        })->toArray();
    }

    /**
     * Consulta pública anonimizada de posicionamento na fila (Lei 14.685/2023).
     *
     * @return array{
     *     numero_protocolo: string,
     *     candidato_nome_mascarado: string,
     *     escola_nome: string,
     *     etapa_ensino: string,
     *     posicao_atual: int,
     *     total_inscritos_etapa: int,
     *     status: string,
     *     data_inscricao: string,
     *     prazo_limite_convocacao?: string|null
     * }
     */
    public function consultaPublicaPorProtocolo(string $protocolo): array
    {
        $application = EducaEnrollmentApplication::query()
            ->with(['candidato', 'escolaPreferencia1'])
            ->where('numero_protocolo', $protocolo)
            ->firstOrFail();


        $waitlist = EducaWaitlist::query()
            ->with('school')
            ->where('application_id', $application->id)
            ->where('school_id', $application->escola_preferencia_1_id)
            ->first();

        $totalInscritos = EducaWaitlist::query()
            ->where('school_id', $application->escola_preferencia_1_id)
            ->where('etapa_ensino', $application->etapa_ensino)
            ->where('status', 'aguardando')
            ->count();

        $nomeCompleto = $application->candidato->nome;
        $nomeMascarado = $this->mascararNome($nomeCompleto);

        return [
            'numero_protocolo' => $application->numero_protocolo,
            'candidato_nome_mascarado' => $nomeMascarado,
            'escola_nome' => $application->escolaPreferencia1->nome,
            'etapa_ensino' => $application->etapa_ensino,
            'posicao_atual' => $waitlist ? $waitlist->posicao : 0,
            'total_inscritos_etapa' => $totalInscritos,
            'status' => $waitlist ? $waitlist->status : $application->status,
            'data_inscricao' => $application->created_at->toISOString(),
            'prazo_limite_convocacao' => $waitlist?->limite_comparecimento?->toISOString(),
        ];
    }

    /**
     * Mascara nome de menores para fins de transparência pública LGPD (ex.: Gabriel Santana -> G****** S******).
     */
    public function mascararNome(string $nome): string
    {
        $partes = explode(' ', trim($nome));
        $mascaradas = [];

        foreach ($partes as $parte) {
            $len = mb_strlen($parte);
            if ($len <= 2) {
                $mascaradas[] = $parte;
            } else {
                $primeira = mb_substr($parte, 0, 1);
                $mascaradas[] = $primeira . str_repeat('*', $len - 1);
            }
        }

        return implode(' ', $mascaradas);
    }
}

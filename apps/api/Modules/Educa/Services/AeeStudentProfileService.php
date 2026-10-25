<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Educa\Models\EducaAeeStudentProfile;
use Modules\Educa\Models\EducaEnrollment;

/**
 * Gestão de Prontuário de Estudantes PAEE, Laudos Médicos e Barreiras de Acessibilidade.
 */
final class AeeStudentProfileService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     status?: string|null,
     *     tipo_condicao?: string|null
     * } $filtros
     * @return Collection<int, EducaAeeStudentProfile>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaAeeStudentProfile::query()
            ->with(['enrollment', 'pessoa', 'school'])
            ->orderBy('created_at', 'desc');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['tipo_condicao'])) {
            $query->where('tipo_condicao', $filtros['tipo_condicao']);
        }

        return $query->get();
    }

    public function obter(string $id, bool $canViewSensitiveData = true): EducaAeeStudentProfile
    {
        $perfil = EducaAeeStudentProfile::with([
            'enrollment',
            'pessoa',
            'school',
            'peis.goals',
            'aeeEnrollments.resourceRoom',
            'supportAllocations.caregiverEmployee',
        ])->findOrFail($id);

        if (! $canViewSensitiveData) {
            $perfil->cid10_codigo = '***';
            $perfil->cid11_codigo = '***';
            $perfil->diagnostico_descricao = 'Informação com sigilo médico restrito (LGPD Art. 11)';
            $perfil->laudo_medico_url = null;
        }

        return $perfil;
    }

    /**
     * @param array{
     *     enrollment_id: string,
     *     pessoa_id: int,
     *     school_id?: string|null,
     *     tipo_condicao: string,
     *     cid10_codigo?: string|null,
     *     cid11_codigo?: string|null,
     *     diagnostico_descricao?: string|null,
     *     laudo_medico_url?: string|null,
     *     laudo_medico_emitido_em?: string|null,
     *     laudo_medico_expira_em?: string|null,
     *     profissional_emissor?: string|null,
     *     registro_profissional?: string|null,
     *     precisa_cuidador?: bool,
     *     precisa_interprete_libras?: bool,
     *     precisa_guia_interprete?: bool,
     *     precisa_transporte_adaptado?: bool,
     *     barreiras_identificadas?: array<int, string>|null,
     *     recursos_acessibilidade?: array<int, string>|null,
     *     status?: string
     * } $dados
     */
    public function criar(array $dados, int $userId = 1): EducaAeeStudentProfile
    {
        return DB::transaction(function () use ($dados): EducaAeeStudentProfile {
            $matricula = EducaEnrollment::findOrFail($dados['enrollment_id']);
            $schoolId = $dados['school_id'] ?? $matricula->school_id;

            $perfil = new EducaAeeStudentProfile();
            $perfil->enrollment_id = $matricula->id;
            $perfil->pessoa_id = (int) $dados['pessoa_id'];
            $perfil->school_id = $schoolId;
            $perfil->tipo_condicao = $dados['tipo_condicao'];
            $perfil->cid10_codigo = $dados['cid10_codigo'] ?? null;
            $perfil->cid11_codigo = $dados['cid11_codigo'] ?? null;
            $perfil->diagnostico_descricao = $dados['diagnostico_descricao'] ?? null;
            $perfil->laudo_medico_url = $dados['laudo_medico_url'] ?? null;
            $perfil->laudo_medico_emitido_em = $dados['laudo_medico_emitido_em'] ?? null;
            $perfil->laudo_medico_expira_em = $dados['laudo_medico_expira_em'] ?? null;
            $perfil->profissional_emissor = $dados['profissional_emissor'] ?? null;
            $perfil->registro_profissional = $dados['registro_profissional'] ?? null;
            $perfil->precisa_cuidador = (bool) ($dados['precisa_cuidador'] ?? false);
            $perfil->precisa_interprete_libras = (bool) ($dados['precisa_interprete_libras'] ?? false);
            $perfil->precisa_guia_interprete = (bool) ($dados['precisa_guia_interprete'] ?? false);
            $perfil->precisa_transporte_adaptado = (bool) ($dados['precisa_transporte_adaptado'] ?? false);
            $perfil->barreiras_identificadas = $dados['barreiras_identificadas'] ?? [];
            $perfil->recursos_acessibilidade = $dados['recursos_acessibilidade'] ?? [];
            $perfil->status = $dados['status'] ?? 'ativo';
            $perfil->save();

            $this->audit->record(
                'educa',
                'educa.aee.student_profile.created',
                "educa_aee_student_profile:{$perfil->id}",
                null,
                $perfil->toArray()
            );

            return $perfil;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $id, array $dados, int $userId = 1): EducaAeeStudentProfile
    {
        return DB::transaction(function () use ($id, $dados): EducaAeeStudentProfile {
            $perfil = EducaAeeStudentProfile::findOrFail($id);
            $perfil->fill($dados);
            $perfil->save();

            $this->audit->record(
                'educa',
                'educa.aee.student_profile.updated',
                "educa_aee_student_profile:{$perfil->id}",
                null,
                $dados
            );

            return $perfil;
        });
    }

    /**
     * @param array{
     *     cid10_codigo: string,
     *     cid11_codigo?: string|null,
     *     diagnostico_descricao?: string|null,
     *     laudo_medico_url?: string|null,
     *     emitido_em: string,
     *     expira_em?: string|null,
     *     profissional_emissor: string,
     *     registro_profissional: string
     * } $laudoDados
     */
    public function anexarLaudo(string $id, array $laudoDados, int $userId = 1): EducaAeeStudentProfile
    {
        return DB::transaction(function () use ($id, $laudoDados): EducaAeeStudentProfile {
            $perfil = EducaAeeStudentProfile::findOrFail($id);
            $perfil->cid10_codigo = $laudoDados['cid10_codigo'];
            $perfil->cid11_codigo = $laudoDados['cid11_codigo'] ?? null;
            $perfil->diagnostico_descricao = $laudoDados['diagnostico_descricao'] ?? null;
            $perfil->laudo_medico_url = $laudoDados['laudo_medico_url'] ?? null;
            $perfil->laudo_medico_emitido_em = $laudoDados['emitido_em'];
            $perfil->laudo_medico_expira_em = $laudoDados['expira_em'] ?? null;
            $perfil->profissional_emissor = $laudoDados['profissional_emissor'];
            $perfil->registro_profissional = $laudoDados['registro_profissional'];
            $perfil->status = 'ativo';
            $perfil->save();

            $this->audit->record(
                'educa',
                'educa.aee.student_profile.laudo_attached',
                "educa_aee_student_profile:{$perfil->id}",
                null,
                $laudoDados
            );

            return $perfil;
        });
    }

    public function deletar(string $id, int $userId = 1): void
    {
        $perfil = EducaAeeStudentProfile::findOrFail($id);
        $perfil->delete();

        $this->audit->record(
            'educa',
            'educa.aee.student_profile.deleted',
            "educa_aee_student_profile:{$id}",
            null,
            ['id' => $id]
        );
    }
}

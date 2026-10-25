<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaDietaryRestriction;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Pessoas\Models\Pessoa;

/**
 * Gestão do Prontuário de Restrições Alimentares, Alergias e Alertas da Cozinha Escolar.
 */
final class DietaryRestrictionService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     pessoa_id?: string|null,
     *     status?: string|null,
     *     tipo_restricao?: string|null,
     *     severidade?: string|null,
     *     school_id?: string|null
     * } $filtros
     * @return Collection<int, EducaDietaryRestriction>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaDietaryRestriction::query()
            ->with(['aluno', 'responsavelRegistro'])
            ->orderByDesc('created_at');

        if (! empty($filtros['pessoa_id'])) {
            $query->where('pessoa_id', $filtros['pessoa_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['tipo_restricao'])) {
            $query->where('tipo_restricao', $filtros['tipo_restricao']);
        }

        if (! empty($filtros['severidade'])) {
            $query->where('severidade', $filtros['severidade']);
        }

        if (! empty($filtros['school_id'])) {
            // Filtra alunos matriculados ativamente nesta escola
            $query->whereHas('aluno.educaEnrollments', function ($q) use ($filtros) {
                $q->where('school_id', $filtros['school_id'])
                    ->where('status', 'ativa');
            });
        }

        return $query->get();
    }

    public function obter(string $restricaoId): EducaDietaryRestriction
    {
        return EducaDietaryRestriction::query()
            ->with(['aluno', 'responsavelRegistro'])
            ->findOrFail($restricaoId);
    }

    /**
     * Cadastra nova restrição alimentar vinculada ao cidadão/estudante.
     *
     * @param array{
     *     pessoa_id: string,
     *     tipo_restricao: string,
     *     alimento_alergeno: string,
     *     severidade: string,
     *     sintomas_reacao?: string|null,
     *     conduta_emergencia?: string|null,
     *     requer_substituicao_especial?: bool|null,
     *     alimento_substituto_recomendado?: string|null,
     *     laudo_medico_crm?: string|null,
     *     laudo_medico_emissor?: string|null,
     *     laudo_medico_data?: string|null,
     *     laudo_documento_url?: string|null,
     *     observacoes?: string|null
     * } $dados
     */
    public function cadastrar(array $dados, int $tenantId, int $userId): EducaDietaryRestriction
    {
        // Valida se o aluno existe
        $aluno = Pessoa::findOrFail($dados['pessoa_id']);

        $severidade = $dados['severidade'] ?? 'moderada';
        $crm = trim($dados['laudo_medico_crm'] ?? '');
        $emissor = trim($dados['laudo_medico_emissor'] ?? '');

        // Casos graves de anafilaxia ou que demandem substituição especial de merenda exigem comprovação por CRM
        if ($severidade === 'grave_anafilaxia' && ($crm === '' || $emissor === '')) {
            throw new InvalidArgumentException('Restrições de severidade Grave/Anafilaxia exigem obrigatoriamente o registro do CRM e nome do médico emissor do laudo.');
        }

        $restricao = EducaDietaryRestriction::create([
            'tenant_id' => $tenantId,
            'pessoa_id' => $aluno->id,
            'tipo_restricao' => $dados['tipo_restricao'],
            'alimento_alergeno' => $dados['alimento_alergeno'],
            'severidade' => $severidade,
            'sintomas_reacao' => $dados['sintomas_reacao'] ?? null,
            'conduta_emergencia' => $dados['conduta_emergencia'] ?? null,
            'requer_substituicao_especial' => (bool) ($dados['requer_substituicao_especial'] ?? false),
            'alimento_substituto_recomendado' => $dados['alimento_substituto_recomendado'] ?? null,
            'laudo_medico_crm' => $crm !== '' ? $crm : null,
            'laudo_medico_emissor' => $emissor !== '' ? $emissor : null,
            'laudo_medico_data' => $dados['laudo_medico_data'] ?? null,
            'laudo_documento_url' => $dados['laudo_documento_url'] ?? null,
            'observacoes' => $dados['observacoes'] ?? null,
            'status' => 'ativa',
            'responsavel_registro_id' => $userId,
        ]);

        $this->audit->record(
            'educa',
            'create',
            "educa_dietary_restriction:{$restricao->id}",
            null,
            $restricao->toArray()
        );

        return $restricao->load('aluno');
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $restricaoId, array $dados): EducaDietaryRestriction
    {
        $restricao = $this->obter($restricaoId);
        $anterior = $restricao->toArray();

        $restricao->update($dados);

        $this->audit->record(
            'educa',
            'update',
            "educa_dietary_restriction:{$restricao->id}",
            $anterior,
            $restricao->toArray()
        );

        return $restricao->fresh(['aluno', 'responsavelRegistro']);
    }

    /**
     * Inativa uma restrição com justificativa médica ou alta de tratamento.
     */
    public function inativar(string $restricaoId, string $motivo): EducaDietaryRestriction
    {
        $restricao = $this->obter($restricaoId);

        if ($restricao->status !== 'ativa') {
            throw new LogicException('Apenas restrições ativas podem ser inativadas.');
        }

        $anterior = $restricao->toArray();

        $restricao->update([
            'status' => 'inativa',
            'observacoes' => trim(($restricao->observacoes ?? '') . " [Inativado em " . Carbon::now()->format('d/m/Y') . ": {$motivo}]"),
        ]);

        $this->audit->record(
            'educa',
            'inativar',
            "educa_dietary_restriction:{$restricao->id}",
            $anterior,
            $restricao->toArray()
        );

        return $restricao->fresh(['aluno', 'responsavelRegistro']);
    }

    /**
     * Consulta lista de alertas de saúde alimentar para a equipe de merenda da escola/turma.
     *
     * @return Collection<int, EducaDietaryRestriction>
     */
    public function obterAlertasParaEscola(string $schoolId): Collection
    {
        // Encontra todos os alunos com matrícula ativa na escola informada
        $pessoasIds = EducaEnrollment::query()
            ->where('school_id', $schoolId)
            ->where('status', 'ativa')
            ->pluck('aluno_pessoa_id');

        return EducaDietaryRestriction::query()
            ->with(['aluno'])
            ->whereIn('pessoa_id', $pessoasIds)
            ->where('status', 'ativa')
            ->orderByRaw("CASE severidade WHEN 'grave_anafilaxia' THEN 1 WHEN 'moderada' THEN 2 ELSE 3 END")
            ->get();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Modules\Escola\Models\TurmaMateria;

/**
 * Escopo do professor (design D6): quem atua só com "pedagogico.professor" (sem nenhuma permissão de gestão)
 * enxerga e opera apenas as turmas × matérias em que é o professor vinculado no cadastro escolar.
 */
final class EscopoProfessor
{
    /** Permissões que dão acesso a todas as turmas do tenant. */
    public const PERMISSOES_GESTAO = [
        'pedagogico.notas.manage', 'pedagogico.ocorrencias.manage', 'pedagogico.conselho.manage', 'pedagogico.frequencia.manage',
    ];

    public function __construct(private readonly TenantContext $tenant) {}

    public function pode(User $user, string $permissao): bool
    {
        return $this->tenant->hasTenant() && $user->hasPermission($permissao, $this->tenant->id());
    }

    /** true quando o usuário só pode ver as próprias turmas. */
    public function restrito(User $user): bool
    {
        foreach (self::PERMISSOES_GESTAO as $permissao) {
            if ($this->pode($user, $permissao)) {
                return false;
            }
        }

        return true;
    }

    public function vinculado(User $user, int $turmaId, ?int $materiaId = null): bool
    {
        return $this->pode($user, 'pedagogico.professor')
            && TurmaMateria::query()
                ->where('professor_user_id', $user->id)
                ->where('turma_id', $turmaId)
                ->when($materiaId !== null, fn ($q) => $q->where('materia_id', $materiaId))
                ->exists();
    }

    /** @return Collection<int, int> */
    public function turmasDoProfessor(User $user): Collection
    {
        return TurmaMateria::query()->where('professor_user_id', $user->id)->pluck('turma_id')->unique()->values();
    }

    /**
     * Restringe uma consulta com coluna turma (direta ou via aluno) às turmas do professor, quando restrito.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     * @param Builder<TModel> $query
     * @return Builder<TModel>
     */
    public function aplicar(Builder $query, User $user, string $colunaTurma = 'turma_id'): Builder
    {
        if (!$this->restrito($user)) {
            return $query;
        }
        $turmas = $this->turmasDoProfessor($user)->all();

        return str_contains($colunaTurma, '.')
            ? $query->whereHas(explode('.', $colunaTurma)[0], fn ($q) => $q->whereIn('turma_id', $turmas))
            : $query->whereIn($colunaTurma, $turmas);
    }
}

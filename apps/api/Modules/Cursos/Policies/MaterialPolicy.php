<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;
use Modules\Cursos\Services\LiberacaoService;

/**
 * Gerir materiais (criar, editar, reordenar, excluir, enviar PDF) é do
 * Administrador e passa pelo `update` do CursoPolicy. Aqui ficam a listagem
 * de gestão e a leitura do conteúdo (design D11 da Fase 2).
 */
final class MaterialPolicy
{
    use PermissoesCursos;

    public function __construct(
        private readonly LiberacaoService $liberacao,
    ) {}

    /** Lista completa de gestão, inclusive materiais não publicados. */
    public function listar(User $user, Curso $curso): bool
    {
        return $this->doTenant($curso) && ($this->administra($user) || $this->instrutorDoCurso($user, $curso->id));
    }

    public function view(User $user, Material $material): bool
    {
        if (!$this->doTenant($material)) {
            return false;
        }

        return $this->administra($user)
            || $this->instrutorDoCurso($user, $material->curso_id)
            || $this->participanteComAcesso($user, $material);
    }

    private function instrutorDoCurso(User $user, int $cursoId): bool
    {
        return $this->pode($user, 'cursos.instrutor')
            && Turma::query()->where('curso_id', $cursoId)->whereHas('instrutores', fn ($q) => $q->where('users.id', $user->id))->exists();
    }

    /** Inscrição confirmada ou já apurada, em turma do curso onde o material está publicado e liberado. */
    private function participanteComAcesso(User $user, Material $material): bool
    {
        if (!$material->publicado || !$this->pode($user, 'cursos.participar')) {
            return false;
        }

        $inscricoes = Inscricao::query()
            ->whereIn('status', [StatusInscricao::Confirmada->value, StatusInscricao::Concluida->value, StatusInscricao::NaoConcluida->value])
            ->whereHas('participante', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('turma', fn ($q) => $q->where('curso_id', $material->curso_id))
            ->with('turma')
            ->get();

        return $inscricoes->contains(fn (Inscricao $inscricao): bool => $this->liberacao->liberado($material, $inscricao->turma));
    }
}

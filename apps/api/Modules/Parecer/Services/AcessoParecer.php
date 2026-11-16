<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Gate;
use Modules\Parecer\Models\FuncaoTurma;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Support\Catalogo;

/**
 * Escopo do parecer, igual ao sistema PHP (ehGestor, turmasDoUsuario, materiasDoUsuario):
 * gestor (parecer.gestor) vê todas as turmas e matérias; os demais, só as turmas em que têm uma
 * função e as matérias dessa função (o regente também cobre as matérias sem professor próprio).
 */
final class AcessoParecer
{
    public function __construct(private readonly TenantContext $tenant) {}

    public function pode(User $user, string $permissao): bool
    {
        return $this->tenant->hasTenant() && $user->hasPermission($permissao, $this->tenant->id());
    }

    public function gestor(User $user): bool
    {
        return $this->pode($user, 'parecer.gestor');
    }

    /**
     * Turmas visíveis: null = todas (gestor).
     *
     * @return list<int>|null
     */
    public function turmasDoUsuario(User $user): ?array
    {
        if ($this->gestor($user)) {
            return null;
        }
        if (!$this->pode($user, 'parecer.professor')) {
            return [];
        }

        return FuncaoTurma::query()->where('user_id', $user->id)->distinct()->pluck('turma_id')->map(fn ($id): int => (int) $id)->values()->all();
    }

    public function podeVerTurma(User $user, int $turmaId): bool
    {
        if (!$this->pode($user, 'parecer.view') || !TurmaSerie::query()->where('turma_id', $turmaId)->exists()) {
            return false;
        }
        $ids = $this->turmasDoUsuario($user);

        return $ids === null || in_array($turmaId, $ids, true);
    }

    public function exigirTurma(User $user, int $turmaId): void
    {
        abort_unless($this->podeVerTurma($user, $turmaId), 403, 'Você não tem acesso a esta turma.');
    }

    /**
     * Matérias que o usuário avalia na turma (gestor: todas).
     *
     * @return list<string>
     */
    public function materiasDoUsuario(User $user, int $turmaId): array
    {
        if ($this->gestor($user)) {
            return array_keys(Catalogo::MATERIAS);
        }
        $funcoes = FuncaoTurma::query()->where('turma_id', $turmaId)->pluck('user_id', 'funcao');
        $mats = [];
        foreach (Catalogo::FUNCOES as $funcao => [, $materias]) {
            if ((int) ($funcoes[$funcao] ?? 0) === $user->id) {
                $mats = [...$mats, ...$materias];
            }
        }
        // Regente cobre as matérias que não têm professor próprio na turma.
        if ((int) ($funcoes['professor_regente'] ?? 0) === $user->id) {
            foreach (Catalogo::FUNCOES as $funcao => [, $materias]) {
                if ($funcao !== 'professor_regente' && $materias !== [] && !isset($funcoes[$funcao])) {
                    $mats = [...$mats, ...$materias];
                }
            }
        }

        return array_values(array_intersect(array_keys(Catalogo::MATERIAS), $mats));
    }

    /**
     * Relatórios: o regente vê todas as matérias da turma; os demais, as da função.
     *
     * @return list<string>
     */
    public function materiasNoRelatorio(User $user, int $turmaId): array
    {
        $regente = FuncaoTurma::query()->where('turma_id', $turmaId)->where('funcao', 'professor_regente')->value('user_id');

        return (int) $regente === $user->id ? array_keys(Catalogo::MATERIAS) : $this->materiasDoUsuario($user, $turmaId);
    }

    public function exigirMateria(User $user, int $turmaId, string $materia): void
    {
        abort_unless(in_array($materia, $this->materiasDoUsuario($user, $turmaId), true), 403, 'Você não avalia esta matéria nesta turma.');
    }

    public function exigirGestor(User $user): void
    {
        abort_unless($this->gestor($user), 403, 'Seu perfil não tem acesso a esta ação.');
    }

    /** Usado pelas Gates do provider. */
    public static function registrarGates(): void
    {
        Gate::define('parecer.gestor', fn (User $user): bool => app(self::class)->gestor($user));
        Gate::define('parecer.auditoria', fn (User $user): bool => app(self::class)->pode($user, 'parecer.auditoria'));
    }
}

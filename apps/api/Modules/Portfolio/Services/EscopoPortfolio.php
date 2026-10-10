<?php

declare(strict_types=1);

namespace Modules\Portfolio\Services;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\TurmaMateria;
use Modules\Portfolio\Models\Trabalho;

/**
 * Escopo do professor no Portfólio (design D3): quem tem portfolio.professor sem portfolio.manage vê e lança
 * apenas nas turmas × matérias em que é o professor vinculado no cadastro escolar. Quem tem só portfolio.view
 * consulta a escola toda, sem gravar.
 */
final class EscopoPortfolio
{
    /** @var array<string, bool> permissões já consultadas, por "usuário:permissão" */
    private array $permissoes = [];

    /** @var array<int, Collection<int, TurmaMateria>> pares turma × matéria do professor, por usuário */
    private array $pares = [];

    public function __construct(private readonly TenantContext $tenant) {}

    /**
     * Instância única da requisição: permissões e vínculos são consultados uma vez só, e não por trabalho
     * listado (controllers, service, policy e resource usam esta). Fica nos atributos da própria requisição
     * para não vazar entre requisições.
     */
    public static function daRequisicao(): self
    {
        $atributos = request()->attributes;
        $escopo = $atributos->get(self::class);
        if (!$escopo instanceof self) {
            $escopo = app(self::class);
            $atributos->set(self::class, $escopo);
        }

        return $escopo;
    }

    public function pode(User $user, string $permissao): bool
    {
        return $this->permissoes["{$user->id}:{$permissao}"] ??= $this->tenant->hasTenant() && $user->hasPermission($permissao, $this->tenant->id());
    }

    /** @return Collection<int, TurmaMateria> */
    private function paresDo(User $user): Collection
    {
        return $this->pares[$user->id] ??= TurmaMateria::query()->where('professor_user_id', $user->id)->get(['turma_id', 'materia_id']);
    }

    public function podeVer(User $user): bool
    {
        return $this->pode($user, 'portfolio.view');
    }

    public function gestor(User $user): bool
    {
        return $this->pode($user, 'portfolio.manage');
    }

    public function restrito(User $user): bool
    {
        return !$this->gestor($user) && $this->pode($user, 'portfolio.professor');
    }

    /** @return Collection<int, int> */
    public function turmasDoProfessor(User $user): Collection
    {
        return $this->paresDo($user)->pluck('turma_id')->unique()->values();
    }

    public function podeVerTurma(User $user, int $turmaId): bool
    {
        if (!$this->podeVer($user)) {
            return false;
        }

        return !$this->restrito($user) || $this->turmasDoProfessor($user)->contains($turmaId);
    }

    public function podeVerAluno(User $user, Aluno $aluno): bool
    {
        return $aluno->turma_id !== null ? $this->podeVerTurma($user, $aluno->turma_id) : ($this->podeVer($user) && !$this->restrito($user));
    }

    public function podeLancar(User $user, int $turmaId, int $materiaId): bool
    {
        if ($this->gestor($user)) {
            return true;
        }

        return $this->pode($user, 'portfolio.professor')
            && $this->paresDo($user)->contains(fn (TurmaMateria $par): bool => $par->turma_id === $turmaId && $par->materia_id === $materiaId);
    }

    public function podeVerTrabalho(User $user, Trabalho $trabalho): bool
    {
        if (!$this->podeVer($user)) {
            return false;
        }

        return !$this->restrito($user) || $this->podeLancar($user, $trabalho->turma_id, $trabalho->materia_id);
    }

    /**
     * @param Builder<Trabalho> $query
     * @return Builder<Trabalho>
     */
    public function restringir(Builder $query, User $user): Builder
    {
        if (!$this->restrito($user)) {
            return $query;
        }
        $pares = $this->paresDo($user);
        if ($pares->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($pares): void {
            foreach ($pares as $par) {
                $q->orWhere(fn (Builder $p) => $p->where('turma_id', $par->turma_id)->where('materia_id', $par->materia_id));
            }
        });
    }
}

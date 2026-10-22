<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Models\Equipe;
use Modules\Multiprofissional\Support\Vinculos;

/** Equipes com seus profissionais e escolas atendidas. Equipe com atendimento é desativada, não excluída. */
final class EquipeService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /** @param array{nome: string, turno?: string|null, ativo?: bool, profissionais?: list<int>, escolas?: list<int>} $dados */
    public function salvar(?Equipe $equipe, array $dados): Equipe
    {
        if (Equipe::query()->where('nome', $dados['nome'])->when($equipe, fn ($q) => $q->whereKeyNot($equipe->id))->exists()) {
            throw new DomainException('Já existe uma equipe com esse nome.');
        }

        return DB::transaction(function () use ($equipe, $dados): Equipe {
            $antes = $equipe === null ? null : $this->retrato($equipe);
            $equipe ??= new Equipe();
            $equipe->fill(['nome' => $dados['nome'], 'turno' => $dados['turno'] ?? null, 'ativo' => $dados['ativo'] ?? true])->save();
            $equipe->profissionais()->sync(Vinculos::comTenant($dados['profissionais'] ?? []));
            $equipe->escolas()->sync(Vinculos::comTenant($dados['escolas'] ?? []));
            $this->audit->record('multiprofissional', $antes === null ? 'equipe.criada' : 'equipe.alterada', "equipe:{$equipe->id}", $antes, $this->retrato($equipe));

            return $equipe;
        });
    }

    public function excluir(Equipe $equipe): bool
    {
        if (Atendimento::withTrashed()->where('equipe_id', $equipe->id)->exists()) {
            $equipe->update(['ativo' => false]);
            $this->audit->record('multiprofissional', 'equipe.desativada', "equipe:{$equipe->id}", null, ['nome' => $equipe->nome]);

            return false;
        }
        $antes = $this->retrato($equipe);
        $equipe->delete();
        $this->audit->record('multiprofissional', 'equipe.excluida', "equipe:{$equipe->id}", $antes, null);

        return true;
    }

    /** @return array<string, mixed> */
    private function retrato(Equipe $equipe): array
    {
        return [
            ...$equipe->only(['nome', 'turno', 'ativo']),
            'profissionais' => $equipe->profissionais()->pluck('multi_profissionais.id')->all(),
            'escolas' => $equipe->escolas()->pluck('escola_escolas.id')->all(),
        ];
    }
}

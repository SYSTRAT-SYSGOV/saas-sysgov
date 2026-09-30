<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Illuminate\Pagination\LengthAwarePaginator;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/** Cadastro, atualização e busca de pessoas físicas (spec: cadastro único, busca e listagem). */
final readonly class PessoaService
{
    /** @param array<string, mixed> $dados */
    public function criar(array $dados): Pessoa
    {
        return Pessoa::create($dados);
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Pessoa $pessoa, array $dados): Pessoa
    {
        $pessoa->update($dados);

        return $pessoa;
    }

    /**
     * @param array{q?: string, tipo_vinculo?: string, status?: string, per_page?: int} $filtros
     * @return LengthAwarePaginator<int, Pessoa>
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        return Pessoa::query()
            ->when($filtros['q'] ?? null, function ($query, string $q): void {
                $digitos = Documento::somenteDigitos($q);
                if (strlen($digitos) === 11) {
                    $query->where('cpf_hash', Documento::hash($digitos));
                } else {
                    $query->where('nome', 'like', "%{$q}%");
                }
            })
            ->when($filtros['tipo_vinculo'] ?? null, fn ($query, string $tipo) => $query->whereHas(
                'vinculos',
                fn ($vinculo) => $vinculo->where('tipo_vinculo', $tipo)
            ))
            ->when($filtros['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('nome')
            ->paginate((int) ($filtros['per_page'] ?? 25));
    }
}

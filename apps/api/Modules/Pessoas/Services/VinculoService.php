<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;

/** Adicionar e encerrar vínculos de papel de uma pessoa (spec: Vínculos de papel modelados em tabela própria). */
final readonly class VinculoService
{
    /** @param array<string, mixed> $dados */
    public function adicionar(Pessoa $pessoa, array $dados): PessoaVinculo
    {
        return $pessoa->vinculos()->create($dados);
    }

    public function encerrar(PessoaVinculo $vinculo, ?string $fim = null): PessoaVinculo
    {
        $vinculo->update(['fim' => $fim ?? today()->toDateString()]);

        return $vinculo;
    }
}

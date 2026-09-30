<?php

declare(strict_types=1);

namespace Modules\Pessoas\Contracts;

interface PessoaImportAdapterInterface
{
    /**
     * Busca os dados de uma pessoa no sistema externo por CPF.
     *
     * @return array<string, mixed>|null null quando não encontrada
     */
    public function buscarPorCpf(string $cpfLimpo): ?array;
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Events;

use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Dados civis de uma pessoa mudaram (nome, nome social, nascimento, mãe, pai). Os módulos
 * consumidores (Escola, Cursos…) escutam para atualizar o que exibem. Disparado só depois de a
 * transação confirmar a gravação.
 */
final class PessoaAtualizada implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    /** Campos civis acompanhados pelos consumidores. */
    public const CAMPOS = ['nome', 'nome_social', 'data_nascimento', 'nome_mae', 'nome_pai'];

    /**
     * @param list<string> $camposAlterados
     */
    public function __construct(
        public readonly int $pessoaId,
        public readonly int $tenantId,
        public readonly array $camposAlterados,
    ) {}
}

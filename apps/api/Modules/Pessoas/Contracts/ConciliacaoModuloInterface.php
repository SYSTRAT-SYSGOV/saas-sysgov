<?php

declare(strict_types=1);

namespace Modules\Pessoas\Contracts;

use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta de um módulo para a conciliação das suas cópias de dado civil com o cadastro central
 * (unificar-cadastro-pessoas, D5). Cada fase de adoção implementa uma e a registra no
 * `ConciliacaoRegistry`; o comando `pessoas:conciliar` faz o resto.
 */
interface ConciliacaoModuloInterface
{
    /** Alias do módulo, usado no comando e na auditoria (ex.: `escola`). */
    public function modulo(): string;

    /** Tabela do módulo cujos registros são conciliados (ex.: `escola_alunos`). */
    public function tabela(): string;

    /**
     * Registros do tenant atual (o contexto de tenant já está definido).
     *
     * @return iterable<RegistroConciliacao>
     */
    public function registros(): iterable;

    /** Grava a referência `pessoa_id` no registro do módulo. */
    public function vincular(int $registroId, int $pessoaId): void;
}

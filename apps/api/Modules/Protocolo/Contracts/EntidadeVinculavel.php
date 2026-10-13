<?php

declare(strict_types=1);

namespace Modules\Protocolo\Contracts;

interface EntidadeVinculavel
{
    /**
     * Identificador do tipo de entidade (ex.: 'requerimento', 'contrato', 'licitacao').
     * Deve casar com o padrão regex '^[a-z][a-z0-9_]{1,63}$'.
     */
    public function tipo(): string;

    /**
     * Valida se a entidade existe no tenant atual.
     */
    public function existe(int $entidadeId): bool;

    /**
     * Verifica se a entidade já foi promovida a processo.
     */
    public function jaPromovida(int $entidadeId): bool;

    /**
     * Efeito colateral executado dentro da transação de promoção.
     */
    public function aoPromover(int $entidadeId, int $processoId): void;

    /**
     * Retorna resumo descritivo da entidade para exibição na aba de vínculos.
     *
     * @return array{titulo: string, detalhes?: string|null, url?: string|null, status?: string|null}
     */
    public function resumo(int $entidadeId): array;
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo;

/**
 * Leiaute de exportação do Registro 60. O domínio (alocações, anulação, tipologias) é comum; cada leiaute só diz quais
 * campos existem, em que ordem e como serializar. O leiaute oficial do Educacenso entra aqui como mais uma
 * implementação (design D28), sem tocar nas regras.
 */
interface Leiaute
{
    public function chave(): string;

    public function nome(): string;

    /** Descrição curta do formato, mostrada ao usuário. */
    public function descricao(): string;

    /** @return list<Campo> campos na ordem das colunas do arquivo */
    public function campos(): array;

    /**
     * Chaves de campos cujo valor vem de um código Inep que o cadastro escolar pode não ter: faltando, a linha ganha
     * a pendência `sem_codigo_inep` em vez de `campo_sem_dado`.
     *
     * @return list<string>
     */
    public function camposDeCodigoInep(): array;
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use DomainException;

/** Linha do CSV recusada, com um código estável para o relatório (`pessoa_nao_encontrada`, `cpf_invalido`, ...). */
final class LinhaInvalida extends DomainException
{
    public function __construct(public readonly string $codigo, string $mensagem)
    {
        parent::__construct($mensagem);
    }
}

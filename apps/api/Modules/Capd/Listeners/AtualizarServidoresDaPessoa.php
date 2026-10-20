<?php

declare(strict_types=1);

namespace Modules\Capd\Listeners;

use Modules\Capd\Services\ServidorPessoaService;
use Modules\Pessoas\Events\PessoaAtualizada;

/** Pessoa corrigida no Cadastro de Pessoas → nome, nome social e nascimento atualizados nos servidores ligados. */
final class AtualizarServidoresDaPessoa
{
    public function __construct(private readonly ServidorPessoaService $servidores) {}

    public function handle(PessoaAtualizada $evento): void
    {
        $this->servidores->atualizarCopias($evento->pessoaId, $evento->tenantId);
    }
}

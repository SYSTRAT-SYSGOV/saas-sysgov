<?php

declare(strict_types=1);

namespace Modules\Escola\Listeners;

use Modules\Escola\Services\AlunoPessoaService;
use Modules\Escola\Services\EquipeService;
use Modules\Pessoas\Events\PessoaAtualizada;

/**
 * Pessoa corrigida no Cadastro de Pessoas → nome/nascimento/mãe/pai atualizados nos alunos
 * ligados e nome atualizado nos membros da equipe gestora ligados.
 */
final class AtualizarAlunosDaPessoa
{
    public function __construct(
        private readonly AlunoPessoaService $alunos,
        private readonly EquipeService $equipe,
    ) {}

    public function handle(PessoaAtualizada $evento): void
    {
        $this->alunos->atualizarCopias($evento->pessoaId, $evento->tenantId);
        if (in_array('nome', $evento->camposAlterados, true)) {
            $this->equipe->atualizarNomesDaPessoa($evento->pessoaId, $evento->tenantId);
        }
    }
}

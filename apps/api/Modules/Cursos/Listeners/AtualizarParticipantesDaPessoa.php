<?php

declare(strict_types=1);

namespace Modules\Cursos\Listeners;

use Modules\Cursos\Services\ParticipantePessoaService;
use Modules\Pessoas\Events\PessoaAtualizada;

/** Nome corrigido no Cadastro de Pessoas → nome dos participantes ligados (certificados emitidos não mudam). */
final class AtualizarParticipantesDaPessoa
{
    public function __construct(private readonly ParticipantePessoaService $participantes) {}

    public function handle(PessoaAtualizada $evento): void
    {
        if (in_array('nome', $evento->camposAlterados, true)) {
            $this->participantes->atualizarNomes($evento->pessoaId, $evento->tenantId);
        }
    }
}

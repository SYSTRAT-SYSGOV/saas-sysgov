<?php

declare(strict_types=1);

namespace Modules\Procurement\Policies;

use App\Models\User;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoArtefato;
use Modules\Procurement\Models\LicitacaoParecer;

final class LicitacaoPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Licitacao $licitacao): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Licitacao $licitacao): bool
    {
        return in_array($licitacao->status, ['rascunho', 'em_fase_interna'], true);
    }

    public function delete(User $user, Licitacao $licitacao): bool
    {
        return $licitacao->status === 'rascunho';
    }

    /**
     * RN-005: Segregação de Funções na aprovação de artefatos
     * Quem elabora/cria o artefato NÃO pode aprová-lo
     */
    public function approveArtifact(User $user, LicitacaoArtefato $artefato): bool
    {
        if ($artefato->created_by === $user->id) {
            return false; // Bloqueio estrito de segregação de funções
        }

        return true;
    }

    /**
     * RN-005: Segregação de Funções na emissão e aprovação de pareceres
     */
    public function approveOpinion(User $user, LicitacaoParecer $parecer): bool
    {
        if ($parecer->created_by === $user->id || $parecer->parecerista_id === $user->id) {
            return false; // O próprio parecerista/elaborador não pode aprovar seu próprio parecer
        }

        return true;
    }

    /**
     * RN-005: Segregação de Funções na homologação da licitação
     * Quem publicou ou criou o processo NÃO pode homologá-lo (exclusivo da Autoridade Competente distinta)
     */
    public function homologate(User $user, Licitacao $licitacao): bool
    {
        if ($licitacao->created_by === $user->id) {
            return false;
        }

        return in_array($licitacao->status, ['adjudicada', 'em_julgamento', 'em_habilitacao'], true);
    }
}

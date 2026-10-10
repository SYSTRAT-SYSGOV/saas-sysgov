<?php

declare(strict_types=1);

namespace Modules\Portfolio\Policies;

use App\Models\User;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\EscopoPortfolio;

/** Trabalhos: leitura pelo escopo (fora dele → 404 no controller); escrita pelo gestor ou professor da matéria. */
final class TrabalhoPolicy
{
    public function view(User $user, Trabalho $trabalho): bool
    {
        return $this->escopo()->podeVerTrabalho($user, $trabalho);
    }

    public function update(User $user, Trabalho $trabalho): bool
    {
        return $this->escopo()->podeLancar($user, $trabalho->turma_id, $trabalho->materia_id);
    }

    public function delete(User $user, Trabalho $trabalho): bool
    {
        return $this->update($user, $trabalho);
    }

    private function escopo(): EscopoPortfolio
    {
        return EscopoPortfolio::daRequisicao();
    }
}

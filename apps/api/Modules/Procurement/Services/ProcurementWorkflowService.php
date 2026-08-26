<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\ProcurementArtefato;
use Illuminate\Validation\UnauthorizedException;

final class ProcurementWorkflowService
{
    public function createArtefato(Licitacao $licitacao, array $data): ProcurementArtefato
    {
        // RN-002: Bloqueio sequencial
        if ($data['tipo'] === 'etp' && !$this->isDfdAprovado($licitacao)) {
            throw new \LogicException('ETP exige DFD aprovado.');
        }

        return ProcurementArtefato::create(array_merge($data, ['licitacao_id' => $licitacao->id]));
    }

    private function isDfdAprovado(Licitacao $licitacao): bool
    {
        return $licitacao->artefatos()
            ->where('tipo', 'dfd')
            ->where('status', 'aprovado')
            ->exists();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Procurement\Policies;

use App\Models\User;
use Modules\Procurement\Models\ProcurementArtefato;

final class ProcurementArtefatoPolicy
{
    public function approve(User $user, ProcurementArtefato $artefato): bool
    {
        // RN-005: Segregação de funções
        if ($artefato->created_by === $user->id) {
            return false;
        }

        return $user->hasPermission('procurement.approve_artefatos') && 
               $user->belongsToTenant($artefato->tenant_id);
    }
}

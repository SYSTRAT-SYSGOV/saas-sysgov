<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\OrgChart\Models\OrgUnit;

/**
 * @mixin OrgUnit
 */
final class OrgUnitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'code' => $this->code,
            'acronym' => $this->acronym,
            'type' => $this->type,
            'level' => $this->level,
            'path' => $this->path,
            'order' => $this->order,
            'is_active' => $this->is_active,
            'inactivation_reason' => $this->inactivation_reason,
            'metadata' => $this->metadata,
            'parent' => $this->whenLoaded('parent', fn() => [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
                'code' => $this->parent->code,
                'acronym' => $this->parent->acronym,
            ]),
            'responsibles' => $this->whenLoaded('responsibles', fn() => $this->responsibles->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => 'responsavel',
                'is_primary' => $u->pivot?->is_primary ?? false,
            ])),
            'users_count' => $this->whenCounted('users', $this->users_count, fn() => $this->users()->count()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

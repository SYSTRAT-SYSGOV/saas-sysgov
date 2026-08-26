<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class InvitationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'tenant' => $this->whenLoaded('tenant', fn () => [
                'id' => $this->tenant->id,
                'name' => $this->tenant->name,
                'slug' => $this->tenant->slug,
            ]),
            'email' => $this->email,
            'role_slug' => $this->role_slug,
            'role' => $this->whenLoaded('role', fn () => [
                'id' => $this->role->id,
                'name' => $this->role->name,
                'slug' => $this->role->slug,
                'scope' => $this->role->scope,
            ]),
            'invited_by' => $this->whenLoaded('inviter', fn () => [
                'id' => $this->inviter->id,
                'name' => $this->inviter->name,
                'email' => $this->inviter->email,
            ]),
            'expires_at' => $this->expires_at?->toISOString(),
            'accepted_at' => $this->accepted_at?->toISOString(),
            'status' => $this->accepted_at ? 'accepted' : ($this->isExpired() ? 'expired' : 'pending'),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
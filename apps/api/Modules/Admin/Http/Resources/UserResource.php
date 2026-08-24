<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_platform_admin' => (bool) $this->is_platform_admin,
            'created_at' => $this->created_at?->toISOString(),
            'tenants' => $this->whenLoaded('tenants', fn () => $this->tenants->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'role_id' => $t->pivot?->role_id,
            ])),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'tenant_id' => $r->tenant_id,
            ])),
        ];
    }
}

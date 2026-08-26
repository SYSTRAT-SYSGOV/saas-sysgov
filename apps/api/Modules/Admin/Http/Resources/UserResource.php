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
            'avatar_url' => $this->avatar_url,
            'is_systrat' => (bool) $this->is_systrat,
            'is_active' => (bool) $this->is_active,
            'is_platform_admin' => (bool) $this->is_platform_admin,
            'mfa_enabled' => (bool) $this->mfa_enabled,
            'mfa_confirmed_at' => $this->mfa_confirmed_at?->toISOString(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'last_login_at' => $this->last_login_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'tenants' => $this->whenLoaded('tenants', fn () => $this->tenants->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'role_id' => $t->pivot?->role_id,
                'role_name' => $t->pivot?->role?->name,
                'status' => $t->pivot?->status,
                'is_primary' => $t->pivot?->is_primary,
            ])),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'scope' => $r->scope,
                'tenant_id' => $r->tenant_id,
            ])),
        ];
    }
}
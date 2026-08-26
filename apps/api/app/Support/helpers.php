<?php

declare(strict_types=1);

if (!function_exists('has_permission')) {
    function has_permission(string $permission, ?int $tenantId = null): bool
    {
        $user = auth()->user();
        if (!$user) {
            return false;
        }
        return $user->hasPermission($permission, $tenantId);
    }
}

if (!function_exists('has_role')) {
    function has_role(string $roleSlug, ?int $tenantId = null): bool
    {
        $user = auth()->user();
        if (!$user) {
            return false;
        }
        return $user->hasRole($roleSlug, $tenantId);
    }
}

if (!function_exists('current_tenant')) {
    function current_tenant(): ?int
    {
        return app(\App\Support\TenantContext::class)->id();
    }
}
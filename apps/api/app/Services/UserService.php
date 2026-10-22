<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserInvitation;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Pessoas\Services\PessoaDoUsuarioService;

final class UserService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    /**
     * Create a SYSTRAT user and assign the systrat role
     *
     * @param array{name: string, email: string, password: string, role_slug: string} $data
     */
    public function createSystratUser(array $data): User
    {
        $validated = collect($data)->only([
            'name', 'email', 'password', 'role_slug'
        ])->toArray();

        $role = Role::where('slug', $validated['role_slug'])
            ->where('scope', 'systrat')
            ->firstOrFail();

        unset($validated['role_slug']);

        return DB::transaction(function () use ($validated, $role): User {
            $user = User::create([
                ...$validated,
                'password' => Hash::make($validated['password']),
                'is_systrat' => true,
                'is_active' => true,
            ]);

            $user->roles()->attach($role->id);

            $this->audit->record('admin', 'user.created', "User #{$user->id}", null, $user->toArray());
            $this->outbox->publish('UserCreated', ['id' => $user->id, 'email' => $user->email]);

            return $user->fresh(['roles', 'tenants']);
        });
    }

    /**
     * Cadastra um administrador do tenant (onboarding). O tenant pode ter N administradores ativos.
     * Se o e-mail já pertence a um usuário existente, ele é reaproveitado (novo vínculo + role
     * admin_tenant) SEM alterar nome nem senha. A duplicidade no mesmo tenant é barrada no controller (409).
     *
     * @param array{name: string, email: string, password?: string|null} $data
     */
    public function createTenantAdmin(Tenant $tenant, array $data): User
    {
        $validated = collect($data)->only(['name', 'email', 'password'])->toArray();

        $adminRole = Role::where('slug', 'admin_tenant')
            ->where('scope', 'tenant')
            ->where('tenant_id', $tenant->id)
            ->first();

        // Garante a role admin_tenant para o tenant (RN-USR-011) — copia permissões do template SYSTRAT
        if (!$adminRole) {
            $templateRole = Role::where('slug', 'admin_tenant')
                ->where('scope', 'tenant')
                ->whereNotNull('tenant_id')
                ->first();

            $adminRole = Role::create([
                'name' => 'Administrador do Tenant',
                'slug' => 'admin_tenant',
                'scope' => 'tenant',
                'tenant_id' => $tenant->id,
                'guard_name' => 'web',
                'is_system' => true,
            ]);

            if ($templateRole) {
                $adminRole->permissions()->sync($templateRole->permissions()->pluck('permissions.id'));
            }
        }

        return DB::transaction(function () use ($validated, $tenant, $adminRole): User {
            $user = User::query()->where('email', $validated['email'])->first()
                ?? User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make((string) $validated['password']),
                    'is_systrat' => false,
                    'is_active' => true,
                ]);

            if ($user->tenants()->where('tenants.id', $tenant->id)->exists()) {
                $user->tenants()->updateExistingPivot($tenant->id, ['role_id' => $adminRole->id, 'status' => 'active']);
            } else {
                $user->tenants()->attach($tenant->id, [
                    'role_id' => $adminRole->id,
                    'status' => 'active',
                    'is_primary' => !$user->tenants()->wherePivot('is_primary', true)->exists(),
                ]);
            }

            $user->roles()->syncWithoutDetaching([$adminRole->id]);
            if (Schema::hasColumn('role_user', 'tenant_id')) {
                DB::table('role_user')
                    ->where('role_id', $adminRole->id)
                    ->where('user_id', $user->id)
                    ->update(['tenant_id' => $tenant->id]);
            }
            $user->clearPermissionCache($tenant->id);
            app(PessoaDoUsuarioService::class)->garantir($user, $tenant, auth()->id(), 'admin');

            $this->audit->record('admin', 'tenant_admin.created', "TenantAdmin #{$user->id} for Tenant #{$tenant->id}", null, $user->toArray());
            $this->outbox->publish('TenantAdminCreated', [
                'user_id' => $user->id,
                'tenant_id' => $tenant->id,
                'email' => $user->email,
            ]);

            return $user->fresh(['roles', 'tenants']);
        });
    }

    /**
     * Update a SYSTRAT user (name, email, is_active, role)
     * RN-USR-006: não permite rebaixar o último super_admin ativo
     *
     * @param array{name?: string, email?: string, is_active?: bool, role_slug?: string} $data
     */
    public function update(User $user, array $data): User
    {
        $validated = collect($data)->only(['name', 'email', 'is_active', 'role_slug', 'password'])->toArray();
        $roleSlug = $validated['role_slug'] ?? null;
        unset($validated['role_slug']);

        // Troca de senha: só persiste quando informada (não fica com string vazia/null)
        if (isset($validated['password']) && $validated['password'] !== '') {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        return DB::transaction(function () use ($user, $validated, $roleSlug): User {
            $before = $user->fresh(['roles'])->toArray();

            if ($validated !== []) {
                if (array_key_exists('is_active', $validated) && $validated['is_active'] === false) {
                    $this->assertNotLastSuperAdmin($user);
                }
                $user->fill($validated)->save();
            }

            if ($roleSlug !== null) {
                $role = Role::where('slug', $roleSlug)
                    ->where('scope', 'systrat')
                    ->firstOrFail();

                $isSuperAdminNow = $user->roles()->where('slug', 'super_admin')->exists();
                if ($isSuperAdminNow && $role->slug !== 'super_admin') {
                    $this->assertNotLastSuperAdmin($user);
                }

                $user->roles()->sync([$role->id]);
                $user->clearPermissionCache();
            }

            $this->audit->record('admin', 'user.updated', "User #{$user->id}", $before, $user->fresh(['roles'])->toArray());
            $this->outbox->publish('UserUpdated', ['id' => $user->id]);

            return $user->fresh(['roles', 'tenants']);
        });
    }

    /**
     * RN-USR-006: proteção do último super_admin ativo
     */
    private function assertNotLastSuperAdmin(User $user): void
    {
        if (!$user->is_platform_admin) {
            return;
        }

        $activeSuperAdmins = User::where('is_platform_admin', true)
            ->where('is_active', true)
            ->where('id', '!=', $user->id)
            ->count();

        if ($activeSuperAdmins === 0) {
            throw ValidationException::withMessages([
                'user' => 'Não é possível desativar ou rebaixar o último super_admin ativo da plataforma.',
            ]);
        }
    }

    /**
     * Deactivate a user (or their link to a specific tenant)
     * Validates RN-USR-006: cannot deactivate last super_admin
     */
    /**
     * @param bool $emergency desativação de emergência pela SYSTRAT: pode desativar o último administrador
     *                        do tenant, desde que informe o motivo (gera auditoria e alerta no Outbox)
     */
    public function deactivate(User $user, string $reason, ?int $tenantId = null, bool $emergency = false): void
    {
        if ($tenantId) {
            $this->deactivateTenantLink($user, $tenantId, $reason, $emergency);
        } else {
            $this->deactivateGlobal($user, $reason, $emergency);
        }
    }

    private function deactivateGlobal(User $user, string $reason, bool $emergency = false): void
    {
        if (!$emergency) {
            (new TenantAdminGuard())->assertNotLastAdminOfAnyTenant($user);
        }

        // RN-USR-006: Cannot deactivate last super_admin
        if ($user->is_platform_admin) {
            $activeSuperAdmins = User::where('is_platform_admin', true)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->count();

            if ($activeSuperAdmins === 0) {
                throw ValidationException::withMessages([
                    'user' => 'Não é possível desativar o último super_admin ativo da plataforma.',
                ]);
            }
        }

        $before = $user->toArray();

        $user->update(['is_active' => false]);

        $this->audit->record('admin', 'user.deactivated', "User #{$user->id}", $before, ['is_active' => false, 'reason' => $reason]);
        $this->outbox->publish('UserDeactivated', [
            'id' => $user->id,
            'reason' => $reason,
        ]);
    }

    private function deactivateTenantLink(User $user, int $tenantId, string $reason, bool $emergency = false): void
    {
        $pivot = \Illuminate\Support\Facades\DB::table('tenant_user')
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$pivot) {
            throw ValidationException::withMessages(['tenant' => 'Usuário não está vinculado a este tenant.']);
        }

        // RN-USR-006: o tenant mantém ao menos um administrador ativo (exceto emergência SYSTRAT com motivo)
        $guard = new TenantAdminGuard();
        $isAdmin = $guard->isActiveAdmin($user, $tenantId);
        $isLastAdmin = $isAdmin && $guard->isLastActiveAdmin($user, $tenantId);

        if ($isLastAdmin && !$emergency) {
            throw ValidationException::withMessages(['user' => TenantAdminGuard::MESSAGE]);
        }
        if ($isLastAdmin && trim($reason) === '') {
            throw ValidationException::withMessages(['reason' => 'Informe o motivo da desativação de emergência do último administrador.']);
        }

        $before = (array) $pivot;

        $user->tenants()->updateExistingPivot($tenantId, ['status' => 'inactive']);

        $this->audit->record('admin', 'tenant_user.deactivated', "TenantUser #{$user->id}@#{$tenantId}", $before, ['status' => 'inactive', 'reason' => $reason]);

        if ($isAdmin) {
            $this->audit->record('admin', 'tenant_admin.deactivated', "TenantAdmin #{$user->id}@#{$tenantId}", $before, [
                'status' => 'inactive',
                'reason' => $reason,
                'emergency' => $emergency,
                'last_admin' => $isLastAdmin,
            ]);
            if ($isLastAdmin) {
                $this->outbox->publish('TenantWithoutAdmin', ['tenant_id' => $tenantId, 'user_id' => $user->id, 'reason' => $reason]);
            }
        }
    }

    /**
     * Reactivate a user globally
     */
    public function reactivate(User $user): void
    {
        $before = $user->toArray();
        $user->update(['is_active' => true]);

        $this->audit->record('admin', 'user.reactivated', "User #{$user->id}", $before, ['is_active' => true]);
        $this->outbox->publish('UserReactivated', ['id' => $user->id]);
    }

    /**
     * Assign a role to a user
     */
    public function assignRole(User $user, Role $role, ?Tenant $tenant = null): void
    {
        if ($tenant) {
            // Assign role in specific tenant context
            $user->tenants()->updateExistingPivot($tenant->id, ['role_id' => $role->id]);
            $user->roles()->syncWithoutDetaching([$role->id]);
            if (\Illuminate\Support\Facades\Schema::hasColumn('role_user', 'tenant_id')) {
                \Illuminate\Support\Facades\DB::table('role_user')
                    ->where('role_id', $role->id)
                    ->where('user_id', $user->id)
                    ->update(['tenant_id' => $tenant->id]);
            }
            $user->clearPermissionCache($tenant->id);
        } else {
            // Global role assignment (for SYSTRAT users)
            $user->roles()->syncWithoutDetaching([$role->id]);
            $user->clearPermissionCache();
        }

        $this->audit->record('admin', 'role.assigned', "User #{$user->id} Role #{$role->id}", null, [
            'role_id' => $role->id,
            'tenant_id' => $tenant?->id,
        ]);
    }

    /**
     * List SYSTRAT users with filters
     *
     * @param array{search?: string, role?: string, status?: string, mfa_pending?: bool} $filters
     * @return \Illuminate\Pagination\LengthAwarePaginator<int, \App\Models\User>
     */
    public function listSystratUsers(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $query = User::query()
            ->systrat()
            ->with(['roles', 'tenants'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['role'])) {
            $query->whereHas('roles', function ($q) use ($filters) {
                $q->where('slug', $filters['role']);
            });
        }

        if (isset($filters['status'])) {
            $query->where('is_active', $filters['status'] === 'active');
        }

        if (!empty($filters['mfa_pending'])) {
            $query->whereHas('roles', function ($q) {
                $q->whereIn('slug', ['super_admin', 'admin_ops']);
            })->where(function ($q) {
                $q->where('mfa_enabled', false)
                  ->orWhereNull('mfa_confirmed_at');
            });
        }

        return $query->paginate($perPage);
    }

/**
     * List tenant users (read-only view for web-admin)
     *
     * @param array{search?: string, status?: string} $filters
     * @return \Illuminate\Pagination\LengthAwarePaginator<int, \App\Models\User>
     */
    public function listTenantUsers(int $tenantId, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        return User::query()
            ->ofTenant($tenantId)
            ->with(['roles', 'tenants' => fn($q) => $q->where('tenant_id', $tenantId)])
            ->when(!empty($filters['search']), fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%");
            }))
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Delete a user and all its links (RN-USR-006: cannot delete last super_admin)
     */
    public function delete(User $user): void
    {
        $this->assertNotLastSuperAdmin($user);

        $before = $user->toArray();

        DB::transaction(function () use ($user): void {
            $user->roles()->detach();
            $user->tenants()->detach();
            $user->tokens()->delete();
            $user->delete();
        });

        $this->audit->record('admin', 'user.deleted', "User #{$user->id}", $before, ['deleted' => true]);
        $this->outbox->publish('UserDeleted', ['id' => $user->id]);
    }

    /**
     * Generate password reset token and queue email via Outbox
     * RN-USR-009: token expira em 60 minutos
     */
    public function requestPasswordReset(string $email): void
    {
        $user = User::where('email', $email)->first();
        if (!$user) {
            return; // Silently fail for security
        }

        $token = Str::random(64);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(60),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->outbox->publish('PasswordResetRequested', [
            'user_id' => $user->id,
            'token' => $token,
            'expires_at' => now()->addMinutes(60)->toISOString(),
        ]);
    }

    /**
     * Reset password with token validation (RN-USR-009)
     */
    public function resetPassword(string $token, string $password): void
    {
        $hash = hash('sha256', $token);

        $record = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('token', $hash)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            throw ValidationException::withMessages(['token' => 'Token inválido ou expirado.']);
        }

        $user = User::where('email', $record->email)->first();

        if (!$user) {
            throw ValidationException::withMessages(['token' => 'Token inválido ou expirado.']);
        }

        $before = $user->toArray();
        $user->forceFill([
            'password' => Hash::make($password),
        ])->save();

        // Marca como usado (impede reuso)
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('token', $hash)
            ->update(['used_at' => now()]);

        $this->audit->record('admin', 'password.reset', "User #{$user->id}", $before, ['password_reset' => true]);
        $this->outbox->publish('PasswordReset', ['id' => $user->id]);
    }
}
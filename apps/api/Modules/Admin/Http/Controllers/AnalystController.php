<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantAnalyst;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

final class AnalystController
{
    use AuthorizesRequests;

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Lista analistas de suporte com suas carteiras de clientes.
     * GET /api/admin/analysts
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tenant::class);

        $analysts = User::query()
            ->whereHas('roles', fn ($q) => $q->where('slug', 'support_analyst'))
            ->with(['roles' => fn ($q) => $q->where('slug', 'support_analyst'), 'analystTenants' => fn ($q) => $q->orderBy('tenants.name')])
            ->get();

        /** @var array<int, array<string, mixed>> $payload */
        $payload = $analysts->map(fn (User $user): array => $this->analystPayload($user))->values()->all();

        return response()->json(['data' => $payload]);
    }

    /**
     * Cria um usuário analista de suporte e atribui a role support_analyst.
     * POST /api/admin/analysts
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $role = Role::where('slug', 'support_analyst')->where('scope', 'systrat')->firstOrFail();

        $analyst = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => $request->string('password'),
            'is_systrat' => true,
            'is_active' => true,
        ]);
        $analyst->roles()->syncWithoutDetaching([$role->id]);

        $this->audit->record('admin', 'analyst.created', "Analyst #{$analyst->id}", null, [
            'email' => $analyst->email,
            'assigned_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => $this->analystPayload($analyst->fresh('analystTenants'))], 201);
    }

    /**
     * Atribui (ou atualiza) um tenant na carteira do analista.
     * POST /api/admin/analysts/{analyst}/tenants
     */
    public function assign(Request $request, User $analyst): JsonResponse
    {
        $this->authorize('update', $analyst);

        $request->validate([
            'tenant_id' => ['required', 'exists:tenants,id'],
            'can_read' => ['sometimes', 'boolean'],
            'can_write' => ['sometimes', 'boolean'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $tenant = Tenant::findOrFail($request->integer('tenant_id'));

        $link = TenantAnalyst::updateOrCreate(
            ['user_id' => $analyst->id, 'tenant_id' => $tenant->id],
            [
                'assigned_by' => $request->user()?->id,
                'can_read' => (bool) $request->boolean('can_read', true),
                'can_write' => (bool) $request->boolean('can_write', false),
                'expires_at' => $request->filled('expires_at') ? $request->date('expires_at') : null,
            ]
        );

        $this->audit->record('admin', 'analyst.tenant_assigned', "Analyst #{$analyst->id} / Tenant #{$tenant->id}", null, $link->toArray());

        return response()->json(['data' => $this->analystPayload($analyst->fresh('analystTenants'))]);
    }

    /**
     * Remove o vínculo do analista com o tenant.
     * DELETE /api/admin/analysts/{analyst}/tenants/{tenant}
     */
    public function revoke(Request $request, User $analyst, Tenant $tenant): JsonResponse
    {
        $this->authorize('update', $analyst);

        $before = TenantAnalyst::where('user_id', $analyst->id)->where('tenant_id', $tenant->id)->first()?->toArray();

        TenantAnalyst::where('user_id', $analyst->id)->where('tenant_id', $tenant->id)->delete();

        $this->audit->record('admin', 'analyst.tenant_revoked', "Analyst #{$analyst->id} / Tenant #{$tenant->id}", $before, null);

        return response()->json(null, 204);
    }

    /**
     * Carteira de clientes do analista autenticado (acessos liberados).
     * GET /api/admin/analysts/my/tenants
     */
    public function myTenants(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->isSupportAnalyst()) {
            return response()->json(['data' => []]);
        }

        $tenants = $user->analystTenants()
            ->where(function ($q) {
                $q->whereNull('tenant_analyst.expires_at')
                  ->orWhere('tenant_analyst.expires_at', '>', now());
            })
            ->orderBy('tenants.name')
            ->get();

        return response()->json(['data' => $this->tenantWalletPayload($tenants)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function analystPayload(User $analyst): array
    {
        return [
            'id' => $analyst->id,
            'name' => $analyst->name,
            'email' => $analyst->email,
            'is_active' => $analyst->is_active,
            'created_at' => $analyst->created_at,
            'tenants' => $this->tenantWalletPayload($analyst->analystTenants),
        ];
    }

    /**
     * @param \Illuminate\Support\Collection<int, Tenant> $tenants
     * @return array<int, array<string, mixed>>
     */
    private function tenantWalletPayload($tenants): array
    {
        return $tenants->map(function (Tenant $t): array {
            /** @var array<string, mixed> $pivot */
            $pivot = $t->getRelationValue('pivot')->getAttributes();

            return [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'cnpj' => $t->cnpj,
                'city' => $t->city,
                'uf' => $t->uf,
                'can_read' => (bool) ($pivot['can_read'] ?? true),
                'can_write' => (bool) ($pivot['can_write'] ?? false),
                'expires_at' => $pivot['expires_at'] ?? null,
            ];
        })->values()->all();
    }
}

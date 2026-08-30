<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Cargo;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD de Cargos (posições/funções) dentro de uma secretaria/órgão do tenant.
 * GET /api/access/cargos
 * POST /api/access/cargos
 * PUT /api/access/cargos/{cargo}
 * DELETE /api/access/cargos/{cargo}
 */
final class CargoController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $cargos = Cargo::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $cargos]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:1000',
        ]);

        $cargo = Cargo::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['data' => $cargo], 201);
    }

    public function update(Request $request, Cargo $cargo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $cargo->tenant_id !== $tenantId, 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $cargo->update($data);

        return response()->json(['data' => $cargo->fresh()]);
    }

    public function destroy(Cargo $cargo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $cargo->tenant_id !== $tenantId, 404);

        $cargo->delete();

        return response()->json(null, 204);
    }
}
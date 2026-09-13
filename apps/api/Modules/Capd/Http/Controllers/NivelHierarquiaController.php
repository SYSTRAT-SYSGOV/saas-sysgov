<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;
use Modules\Capd\Models\NivelHierarquia;

final class NivelHierarquiaController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly AuditLogger $audit,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.hierarquia.view'), 403);

        return response()->json(
            NivelHierarquia::query()->ordenados()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.hierarquia.manage'), 403);

        $validated = $this->validarNivel($request);

        if ($validated['is_topo'] ?? false) {
            $this->garantirTopoUnico($request);
        }

        $nivel = NivelHierarquia::query()->create([
            ...$validated,
            'tenant_id' => $this->tenantContext->id(),
        ]);

        $this->audit->record('capd', 'nivel_hierarquia.created', "NivelHierarquia #{$nivel->id}", null, $nivel->toArray());

        return response()->json($nivel, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.hierarquia.manage'), 403);

        $nivel = NivelHierarquia::query()->findOrFail($id);
        $validated = $this->validarNivel($request, $nivel->id);

        if ($validated['is_topo'] ?? $nivel->is_topo) {
            $this->garantirTopoUnico($request, $nivel->id);
        }

        $before = $nivel->toArray();
        $nivel->update($validated);

        $this->audit->record('capd', 'nivel_hierarquia.updated', "NivelHierarquia #{$id}", $before, $nivel->fresh()->toArray());

        return response()->json($nivel->fresh());
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.hierarquia.manage'), 403);

        $nivel = NivelHierarquia::query()->findOrFail($id);
        $nivel->update(['ativo' => false]);

        $this->audit->record('capd', 'nivel_hierarquia.desativado', "NivelHierarquia #{$id}", null, null);

        return response()->json(['message' => 'Nível hierárquico desativado com sucesso.']);
    }

    private function validarNivel(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'nivel'                     => [
                'required', 'integer', 'min:0',
                'unique:capd_niveis_hierarquia,nivel,' . ($ignoreId ?? 'NULL') . ',id,tenant_id,' . $this->tenantContext->id(),
            ],
            'nome'                      => ['required', 'string', 'max:100'],
            'cargo_referencia'          => ['nullable', 'string', 'max:120'],
            'regra_substituicao'        => ['required', 'string', 'in:substituto_legal,superior_hierarquico'],
            'is_topo'                   => ['nullable', 'boolean'],
            'avaliador_topo_user_id'    => ['nullable', 'integer', 'exists:users,id'],
            'avaliador_topo_role'       => ['nullable', 'string', 'max:60'],
            'ativo'                     => ['nullable', 'boolean'],
        ]);
    }

    private function garantirTopoUnico(Request $request, ?int $ignoreId = null): void
    {
        $existeOutroTopo = NivelHierarquia::query()
            ->where('is_topo', true)
            ->when($ignoreId !== null, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($existeOutroTopo) {
            throw ValidationException::withMessages([
                'is_topo' => 'Já existe um nível configurado como topo da hierarquia para este tenant.',
            ]);
        }
    }
}

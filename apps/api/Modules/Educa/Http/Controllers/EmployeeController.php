<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\EmployeeCreateRequest;
use Modules\Educa\Http\Requests\EmployeeRoleCreateRequest;
use Modules\Educa\Http\Requests\EmployeeUpdateRequest;
use Modules\Educa\Models\EducaEmployee;
use Modules\Educa\Services\EmployeeService;

final class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaEmployee::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $servidores = $this->service->listar($request->all(), $tenantId);

        return response()->json(['data' => $servidores]);
    }

    public function store(EmployeeCreateRequest $request): JsonResponse
    {
        $this->authorize('create', EducaEmployee::class);
        $tenantId = (int) app(TenantContext::class)->id();

        $servidor = $this->service->cadastrar($request->validated(), $tenantId);

        return response()->json(['data' => $servidor], 201);
    }

    public function show(string $servidorId): JsonResponse
    {
        $this->authorize('view', EducaEmployee::class);

        $servidor = $this->service->detalhar($servidorId);

        return response()->json(['data' => $servidor]);
    }

    public function update(string $servidorId, EmployeeUpdateRequest $request): JsonResponse
    {
        $this->authorize('update', EducaEmployee::class);

        $servidor = $this->service->atualizar($servidorId, $request->validated());

        return response()->json(['data' => $servidor]);
    }

    public function storeFuncao(string $servidorId, EmployeeRoleCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEmployee::class);

        $funcao = $this->service->adicionarFuncao($servidorId, $request->validated());

        return response()->json(['data' => $funcao], 201);
    }

    public function destroyFuncao(string $servidorId, string $funcaoId): JsonResponse
    {
        $this->authorize('manage', EducaEmployee::class);

        $this->service->removerFuncao($servidorId, $funcaoId);

        return response()->json(null, 204);
    }

    public function syncHabilitacoes(string $servidorId, Request $request): JsonResponse
    {
        $this->authorize('manage', EducaEmployee::class);

        $request->validate([
            'component_ids' => ['required', 'array'],
            'component_ids.*' => ['uuid'],
        ]);

        $habilitacoes = $this->service->sincronizarHabilitacoes($servidorId, $request->input('component_ids', []));

        return response()->json(['data' => $habilitacoes]);
    }
}

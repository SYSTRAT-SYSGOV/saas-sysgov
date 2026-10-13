<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\OrgScope;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Protocolo\Http\Requests\StoreAtributoRequest;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Processo;

final class AtributoController extends Controller
{
    public function __construct(
        private readonly OrgScope $orgScope,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view')) {
                return response()->json(['message' => 'Sem permissão para visualizar este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
                && !$this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id)) {
                return response()->json(['message' => 'Processo fora do escopo da sua unidade.'], 403);
            }
        }

        $atributos = $processo->atributos()->get();

        return response()->json($atributos);
    }

    public function store(StoreAtributoRequest $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para editar atributos deste processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $atributo = Atributo::create([
            'tenant_id' => $tenantId,
            'processo_id' => $processo->id,
            'chave' => $request->input('chave'),
            'tipo_atributo' => $request->input('tipo_atributo'),
            'valor' => $request->input('valor'),
        ]);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'atributo.adicionar',
            resource: "Atributo '{$atributo->chave}' no Processo #{$processo->id}",
            before: null,
            after: $atributo->toArray(),
        );

        return response()->json($atributo, 201);
    }

    public function destroy(Request $request, Processo $processo, string $chave): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para remover atributos deste processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $atributo = Atributo::query()
            ->where('tenant_id', $tenantId)
            ->where('processo_id', $processo->id)
            ->where('chave', $chave)
            ->first();

        if ($atributo === null) {
            return response()->json(['message' => 'Atributo não encontrado.'], 404);
        }

        $before = $atributo->toArray();
        $atributo->delete();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'atributo.remover',
            resource: "Atributo '{$chave}' do Processo #{$processo->id}",
            before: $before,
            after: null,
        );

        return response()->json(['message' => 'Atributo removido com sucesso.']);
    }
}

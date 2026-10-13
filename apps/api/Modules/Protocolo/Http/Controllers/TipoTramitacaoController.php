<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Protocolo\Http\Requests\StoreTipoTramitacaoRequest;
use Modules\Protocolo\Http\Requests\UpdateTipoTramitacaoRequest;
use Modules\Protocolo\Models\TipoTramitacao;

final class TipoTramitacaoController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            $podeVer = $user->hasPermission('protocolo.tipos_tramitacao.manage')
                || $user->hasPermission('protocolo.processos.view')
                || $user->hasPermission('protocolo.processos.tramitar');

            if (!$podeVer) {
                return response()->json(['message' => 'Acesso não autorizado.'], 403);
            }
        }

        $query = TipoTramitacao::query();

        // Se não pedir todos explicitamente com permissão de gerência, lista apenas os ativos
        $podeGerenciar = $user?->is_platform_admin || $user?->hasPermission('protocolo.tipos_tramitacao.manage');
        if (!$request->boolean('todos') || !$podeGerenciar) {
            $query->where('ativo', true);
        }

        $tipos = $query->orderBy('nome')->get();

        return response()->json($tipos);
    }

    public function store(StoreTipoTramitacaoRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.tipos_tramitacao.manage')) {
            return response()->json(['message' => 'Sem permissão para cadastrar tipos de tramitação.'], 403);
        }

        $tipo = TipoTramitacao::create([
            'slug' => $request->input('slug'),
            'nome' => $request->input('nome'),
            'descricao' => $request->input('descricao'),
            'prazo_dias' => $request->input('prazo_dias'),
            'efeito_status' => $request->input('efeito_status'),
            'ativo' => $request->boolean('ativo', true),
        ]);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'tipo_tramitacao.criar',
            resource: "TipoTramitacao #{$tipo->id} ({$tipo->nome})",
            before: null,
            after: $tipo->toArray(),
        );

        return response()->json($tipo, 201);
    }

    public function show(Request $request, TipoTramitacao $tipoTramitacao): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($tipoTramitacao->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Tipo de tramitação não encontrado.'], 404);
        }

        return response()->json($tipoTramitacao);
    }

    public function update(UpdateTipoTramitacaoRequest $request, TipoTramitacao $tipoTramitacao): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($tipoTramitacao->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Tipo de tramitação não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.tipos_tramitacao.manage')) {
            return response()->json(['message' => 'Sem permissão para editar tipos de tramitação.'], 403);
        }

        $before = $tipoTramitacao->toArray();
        $tipoTramitacao->fill($request->only(['slug', 'nome', 'descricao', 'prazo_dias', 'efeito_status', 'ativo']));
        $tipoTramitacao->save();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'tipo_tramitacao.editar',
            resource: "TipoTramitacao #{$tipoTramitacao->id} ({$tipoTramitacao->nome})",
            before: $before,
            after: $tipoTramitacao->toArray(),
        );

        return response()->json($tipoTramitacao);
    }

    public function destroy(Request $request, TipoTramitacao $tipoTramitacao): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($tipoTramitacao->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Tipo de tramitação não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.tipos_tramitacao.manage')) {
            return response()->json(['message' => 'Sem permissão para excluir tipos de tramitação.'], 403);
        }

        $before = $tipoTramitacao->toArray();
        $tipoTramitacao->delete();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'tipo_tramitacao.excluir',
            resource: "TipoTramitacao #{$tipoTramitacao->id} ({$tipoTramitacao->nome})",
            before: $before,
            after: null,
        );

        return response()->json(['message' => 'Tipo de tramitação excluído com sucesso.']);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\OrgScope;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LogicException;
use Modules\Protocolo\Http\Requests\PromoverRequerimentoRequest;
use Modules\Protocolo\Http\Requests\StoreVinculoRequest;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\Vinculo;
use Modules\Protocolo\Services\PromocaoService;
use Modules\Protocolo\Services\VinculoRegistry;

final class VinculoController extends Controller
{
    public function __construct(
        private readonly VinculoRegistry $vinculoRegistry,
        private readonly PromocaoService $promocaoService,
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

        $vinculos = $processo->vinculos()->get()->map(function (Vinculo $v): array {
            $data = $v->toArray();
            $handler = $this->vinculoRegistry->resolver($v->entidade_tipo);
            if ($handler !== null && $handler->existe($v->entidade_id)) {
                $data['resumo'] = $handler->resumo($v->entidade_id);
            } else {
                $data['resumo'] = null;
            }
            return $data;
        });

        return response()->json($vinculos);
    }

    public function store(StoreVinculoRequest $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.vincular') && !$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para vincular entidades a este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $entidadeTipo = (string) $request->input('entidade_tipo');
        $entidadeId = (int) $request->input('entidade_id');
        $papelVinculo = (string) $request->input('papel_vinculo');

        // Se houver handler registrado, valida se a entidade existe
        $handler = $this->vinculoRegistry->resolver($entidadeTipo);
        if ($handler !== null && !$handler->existe($entidadeId)) {
            return response()->json(['message' => "Entidade '{$entidadeTipo}' #{$entidadeId} não encontrada."], 404);
        }

        // Verifica unicidade do vínculo exato
        $jaExiste = Vinculo::query()
            ->where('tenant_id', $tenantId)
            ->where('processo_id', $processo->id)
            ->where('entidade_tipo', $entidadeTipo)
            ->where('entidade_id', $entidadeId)
            ->where('papel_vinculo', $papelVinculo)
            ->exists();

        if ($jaExiste) {
            return response()->json(['message' => 'Este vínculo já existe no processo.'], 409);
        }

        // Se for papel 'origem', impede duplicidade de vínculo de origem
        if ($papelVinculo === 'origem') {
            $temOrigem = Vinculo::query()
                ->where('tenant_id', $tenantId)
                ->where('processo_id', $processo->id)
                ->where('papel_vinculo', 'origem')
                ->exists();

            if ($temOrigem) {
                return response()->json(['message' => 'O processo já possui um vínculo de origem.'], 409);
            }
        }

        $vinculo = Vinculo::create([
            'tenant_id' => $tenantId,
            'processo_id' => $processo->id,
            'entidade_tipo' => $entidadeTipo,
            'entidade_id' => $entidadeId,
            'papel_vinculo' => $papelVinculo,
        ]);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'vinculo.criar',
            resource: "Vínculo #{$vinculo->id} ({$entidadeTipo}#{$entidadeId}) no Processo #{$processo->id}",
            before: null,
            after: $vinculo->toArray(),
        );

        $resultado = $vinculo->toArray();
        if ($handler !== null) {
            $resultado['resumo'] = $handler->resumo($entidadeId);
        }

        return response()->json($resultado, 201);
    }

    public function destroy(Request $request, Processo $processo, Vinculo $vinculo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId || $vinculo->tenant_id !== $tenantId || $vinculo->processo_id !== $processo->id) {
            return response()->json(['message' => 'Vínculo não encontrado.'], 404);
        }

        // TRAVA DE SEGURANÇA: Vínculo de origem não pode ser removido (D6/D7)
        if ($vinculo->papel_vinculo === 'origem') {
            return response()->json(['message' => 'Não é permitido remover o vínculo de origem do processo.'], 409);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.vincular') && !$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para remover vínculos deste processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $before = $vinculo->toArray();
        $vinculo->delete();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'vinculo.remover',
            resource: "Vínculo #{$vinculo->id} ({$vinculo->entidade_tipo}#{$vinculo->entidade_id}) do Processo #{$processo->id}",
            before: $before,
            after: null,
        );

        return response()->json(['message' => 'Vínculo removido com sucesso.']);
    }

    public function consultaReversa(Request $request): JsonResponse
    {
        $request->validate([
            'entidade_tipo' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]{1,63}$/'],
            'entidade_id' => ['required', 'integer', 'min:1'],
        ]);

        $vinculos = Vinculo::query()
            ->where('entidade_tipo', (string) $request->input('entidade_tipo'))
            ->where('entidade_id', (int) $request->input('entidade_id'))
            ->with(['processo.orgaoAtual', 'processo.andamentoAtual'])
            ->get();

        return response()->json($vinculos);
    }

    public function promoverRequerimento(PromoverRequerimentoRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.promover_requerimento')) {
            return response()->json(['message' => 'Sem permissão para promover requerimento a processo.'], 403);
        }

        try {
            $processo = $this->promocaoService->promoverRequerimento(
                requerimentoId: (int) $request->input('requerimento_id'),
                dadosProcesso: array_merge($request->all(), [
                    'created_by' => $user?->id,
                ]),
            );
        } catch (LogicException $e) {
            $code = $e->getCode();
            $status = in_array($code, [404, 409, 422], true) ? $code : 422;
            return response()->json(['message' => $e->getMessage()], $status);
        }

        $processo->load(['orgaoOrigem', 'orgaoAtual', 'andamentoAtual', 'vinculos']);

        return response()->json($processo, 201);
    }
}

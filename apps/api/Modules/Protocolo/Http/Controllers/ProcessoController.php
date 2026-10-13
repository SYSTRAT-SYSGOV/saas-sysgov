<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\OrgScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Protocolo\Http\Requests\StoreProcessoRequest;
use Modules\Protocolo\Http\Requests\UpdateProcessoRequest;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Services\ProcessoService;

final class ProcessoController extends Controller
{
    public function __construct(
        private readonly ProcessoService $processoService,
        private readonly OrgScope $orgScope,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.view')) {
            return response()->json(['message' => 'Acesso não autorizado ao módulo Protocolo.'], 403);
        }

        $query = Processo::query()->with(['orgaoOrigem', 'orgaoAtual', 'andamentoAtual', 'interessado']);

        // Escopo organizacional (ABAC)
        if ($user !== null) {
            $unitIds = $this->orgScope->unitIdsFor($user);
            if ($unitIds !== null) {
                $query->where(function ($q) use ($unitIds): void {
                    $q->whereIn('orgao_atual_id', $unitIds)
                      ->orWhereIn('orgao_origem_id', $unitIds);
                });
            }
        }

        // Filtro por busca textual (número, assunto, interessado)
        if ($request->filled('q')) {
            $termo = trim((string) $request->input('q'));
            $query->where(function ($q) use ($termo): void {
                // Tenta extrair número se estiver no formato NNNN/AAAA
                if (preg_match('/^(\d+)\/(\d{4})$/', $termo, $m) === 1) {
                    $q->where('numero', (int) $m[1])->where('ano', (int) $m[2]);
                } elseif (is_numeric($termo)) {
                    $q->where('numero', (int) $termo);
                }

                $q->orWhere('assunto', 'like', "%{$termo}%")
                  ->orWhereHas('interessado', function ($qp) use ($termo): void {
                      $qp->where('nome', 'like', "%{$termo}%")
                         ->orWhere('documento', 'like', "%{$termo}%");
                  });
            });
        }

        // Filtros específicos
        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }

        if ($request->filled('origem')) {
            $query->where('origem', (string) $request->input('origem'));
        }

        if ($request->filled('orgao_id')) {
            $query->where('orgao_atual_id', (int) $request->input('orgao_id'));
        }

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->input('ano'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
        $processos = $query->orderByDesc('id')->paginate($perPage);

        return response()->json($processos);
    }

    public function store(StoreProcessoRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.create')) {
            return response()->json(['message' => 'Sem permissão para abrir processos.'], 403);
        }

        $atributos = (array) $request->input('atributos', []);
        $andamentoInicial = (array) $request->input('andamento_inicial', []);

        // Processamento de arquivos multipart
        $documentosInput = [];
        if ($request->has('documentos') && is_array($request->input('documentos'))) {
            foreach ($request->input('documentos') as $index => $docData) {
                if ($request->hasFile("documentos.{$index}.arquivo")) {
                    $documentosInput[] = [
                        'tipo_documento' => $docData['tipo_documento'] ?? 'anexo',
                        'arquivo' => $request->file("documentos.{$index}.arquivo"),
                        'nome_arquivo' => $docData['nome_arquivo'] ?? null,
                    ];
                }
            }
        }

        $dadosProcesso = [
            'assunto' => $request->input('assunto'),
            'origem' => $request->input('origem'),
            'orgao_origem_id' => (int) $request->input('orgao_origem_id'),
            'orgao_atual_id' => $request->filled('orgao_atual_id') ? (int) $request->input('orgao_atual_id') : null,
            'interessado_pessoa_id' => $request->filled('interessado_pessoa_id') ? (int) $request->input('interessado_pessoa_id') : null,
            'processo_pai_id' => $request->filled('processo_pai_id') ? (int) $request->input('processo_pai_id') : null,
            'data_abertura' => $request->input('data_abertura'),
            'created_by' => $user?->id,
        ];

        $processo = $this->processoService->abrir(
            dadosProcesso: $dadosProcesso,
            atributos: $atributos,
            documentos: $documentosInput,
            dadosAndamentoInicial: !empty($andamentoInicial) ? $andamentoInicial : null,
        );

        $processo->load(['orgaoOrigem', 'orgaoAtual', 'andamentoAtual', 'documentos', 'atributos', 'interessado']);

        return response()->json($processo, 201);
    }

    public function show(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
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

        $processo->load([
            'orgaoOrigem',
            'orgaoAtual',
            'interessado',
            'processoPai',
            'filhos.orgaoAtual',
            'filhos.andamentoAtual',
            'andamentos.tipoTramitacao',
            'andamentos.orgaoOrigem',
            'andamentos.orgaoDestino',
            'andamentos.usuario',
            'andamentos.usuarioRecebedor',
            'documentos',
            'atributos',
            'vinculos',
        ]);

        return response()->json($processo);
    }

    public function update(UpdateProcessoRequest $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para editar processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'O processo não está sob a posse da sua unidade.'], 403);
            }
        }

        $before = $processo->only(['assunto', 'interessado_pessoa_id', 'processo_pai_id']);

        $processo->fill($request->only(['assunto', 'interessado_pessoa_id', 'processo_pai_id']));
        $processo->save();

        $after = $processo->only(['assunto', 'interessado_pessoa_id', 'processo_pai_id']);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'processo.editar',
            resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
            before: $before,
            after: $after,
        );

        return response()->json($processo);
    }

    public function destroy(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.delete')) {
            return response()->json(['message' => 'Sem permissão para excluir processos.'], 403);
        }

        // Impede exclusão se houver processos filhos ativos
        if ($processo->filhos()->exists()) {
            return response()->json([
                'message' => 'Não é possível excluir um processo que possui processos filhos ativos.',
            ], 409);
        }

        $before = $processo->toArray();
        $processo->delete();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'processo.excluir',
            resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
            before: $before,
            after: null,
        );

        return response()->json(['message' => 'Processo excluído com sucesso.']);
    }

    public function filhos(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.view')) {
            return response()->json(['message' => 'Acesso não autorizado.'], 403);
        }

        $filhos = $processo->filhos()->with(['orgaoAtual', 'andamentoAtual'])->get();

        return response()->json($filhos);
    }
}

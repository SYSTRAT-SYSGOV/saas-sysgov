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

        // Filtro por busca textual (número, assunto, interessado, descrição, tipo)
        if ($request->filled('q')) {
            $termo = trim((string) $request->input('q'));
            $digits = preg_replace('/\D/', '', $termo) ?? '';

            $query->where(function ($q) use ($termo, $digits): void {
                // Tenta extrair número se estiver no formato NNNN/AAAA
                if (preg_match('/^(\d+)\/(\d{4})$/', $termo, $m) === 1) {
                    $q->where('numero', (int) $m[1])->where('ano', (int) $m[2]);
                } elseif (is_numeric($termo)) {
                    $q->where('numero', (int) $termo);
                }

                $q->orWhere('assunto', 'like', "%{$termo}%")
                  ->orWhere('descricao', 'like', "%{$termo}%")
                  ->orWhere('tipo_processo', 'like', "%{$termo}%")
                  ->orWhereHas('interessado', function ($qp) use ($termo, $digits): void {
                      $qp->where('nome', 'like', "%{$termo}%");
                      if ($digits !== '') {
                          $docHash = \Modules\Pessoas\Support\Documento::hash($digits);
                          $qp->orWhere('documento_hash', $docHash);
                      }
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

        if ($request->filled('tipo_processo')) {
            $query->where('tipo_processo', (string) $request->input('tipo_processo'));
        }

        if ($request->filled('arquivamento_tipo')) {
            $query->where('arquivamento_tipo', (string) $request->input('arquivamento_tipo'));
        }

        if ($request->filled('sigiloso')) {
            $query->where('sigiloso', filter_var($request->input('sigiloso'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('orgao_id')) {
            $query->where('orgao_atual_id', (int) $request->input('orgao_id'));
        }

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->input('ano'));
        }

        // Filtro de sigilo (LGPD/Segurança): processos sigilosos só aparecem para membros da unidade ou admins
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.view_sigiloso')) {
            $unitIds = $this->orgScope->unitIdsFor($user);
            if ($unitIds !== null) {
                $query->where(function ($q) use ($unitIds): void {
                    $q->where('sigiloso', false)
                      ->orWhere(function ($qs) use ($unitIds): void {
                          $qs->where('sigiloso', true)
                             ->where(function ($qu) use ($unitIds): void {
                                 $qu->whereIn('orgao_atual_id', $unitIds)
                                    ->orWhereIn('orgao_origem_id', $unitIds);
                             });
                      });
                });
            } else {
                $query->where('sigiloso', false);
            }
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
            'descricao' => $request->input('descricao'),
            'tipo_processo' => $request->input('tipo_processo', 'administrativo_geral'),
            'sigiloso' => filter_var($request->input('sigiloso', false), FILTER_VALIDATE_BOOLEAN),
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

        $camposPermitidos = ['assunto', 'descricao', 'tipo_processo', 'sigiloso', 'interessado_pessoa_id', 'processo_pai_id'];
        $before = $processo->only($camposPermitidos);

        $processo->fill($request->only($camposPermitidos));
        $processo->save();

        $after = $processo->only($camposPermitidos);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'processo.editar',
            resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
            before: $before,
            after: $after,
        );

        return response()->json($processo);
    }

    public function concluir(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar')) {
                return response()->json(['message' => 'Sem permissão para concluir processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'O processo não está sob a posse da sua unidade.'], 403);
            }
        }

        try {
            $despacho = $request->filled('despacho') ? (string) $request->input('despacho') : null;
            $atualizado = $this->processoService->concluir($processo, (int) $user?->id, $despacho);
        } catch (\LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($atualizado);
    }

    public function arquivar(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar')) {
                return response()->json(['message' => 'Sem permissão para arquivar processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'O processo não está sob a posse da sua unidade.'], 403);
            }
        }

        $tipo = (string) $request->input('tipo_arquivamento', 'corrente');
        $despacho = $request->filled('despacho') ? (string) $request->input('despacho') : null;

        try {
            $atualizado = $this->processoService->arquivar($processo, (int) $user?->id, $tipo, $despacho);
        } catch (\InvalidArgumentException|\LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($atualizado);
    }

    public function desarquivar(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar')) {
                return response()->json(['message' => 'Sem permissão para desarquivar processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'O processo não está sob a posse da sua unidade.'], 403);
            }
        }

        $motivo = $request->filled('motivo') ? (string) $request->input('motivo') : null;

        try {
            $atualizado = $this->processoService->desarquivar($processo, (int) $user?->id, $motivo);
        } catch (\LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($atualizado);
    }

    public function reabrir(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(\App\Support\TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar')) {
                return response()->json(['message' => 'Sem permissão para reabrir processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'O processo não está sob a posse da sua unidade.'], 403);
            }
        }

        $motivo = $request->filled('motivo') ? (string) $request->input('motivo') : null;

        try {
            $atualizado = $this->processoService->reabrir($processo, (int) $user?->id, $motivo);
        } catch (\LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($atualizado);
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

    /**
     * Exporta os processos em formato CSV estruturado conforme os filtros aplicados.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.relatorios')) {
            abort(403, 'Sem permissão para exportar dados do Protocolo.');
        }

        $query = Processo::query()->with(['orgaoOrigem', 'orgaoAtual', 'interessado']);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }
        if ($request->filled('origem')) {
            $query->where('origem', (string) $request->input('origem'));
        }
        if ($request->filled('tipo_processo')) {
            $query->where('tipo_processo', (string) $request->input('tipo_processo'));
        }
        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->input('ano'));
        }

        $processos = $query->orderByDesc('id')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="protocolo_processos_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($processos): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            // UTF-8 BOM para Excel
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'ID',
                'Número',
                'Ano',
                'Processo Formatado',
                'Tipo',
                'Origem',
                'Status',
                'Sigiloso',
                'Assunto',
                'Órgão Origem',
                'Órgão Atual',
                'Interessado',
                'Data Abertura',
                'Data Conclusão',
            ], ';');

            foreach ($processos as $p) {
                fputcsv($handle, [
                    $p->id,
                    $p->numero,
                    $p->ano,
                    $p->numero_formatado,
                    $p->tipo_processo,
                    $p->origem,
                    $p->status,
                    $p->sigiloso ? 'Sim' : 'Não',
                    $p->assunto,
                    $p->orgaoOrigem?->name ?? 'N/D',
                    $p->orgaoAtual?->name ?? 'N/D',
                    $p->interessado?->nome ?? 'N/D',
                    $p->data_abertura->format('d/m/Y H:i'),
                    $p->data_conclusao?->format('d/m/Y H:i') ?? '',
                ], ';');
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Consulta pública segura (acompanhamento por interessado estilo transparência).
     */
    public function rastrearPublico(Request $request): JsonResponse
    {
        $numeroInput = trim((string) $request->input('numero'));
        $ano = (int) $request->input('ano', (int) date('Y'));
        $numero = 0;

        if (preg_match('/^(\d+)\/(\d{4})$/', $numeroInput, $m) === 1) {
            $numero = (int) $m[1];
            $ano = (int) $m[2];
        } elseif (is_numeric($numeroInput)) {
            $numero = (int) $numeroInput;
        }

        if ($numero <= 0) {
            return response()->json(['message' => 'Informe o número e ano do processo.'], 422);
        }

        $tenantId = app(\App\Support\TenantContext::class)->id();

        $processo = Processo::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('numero', $numero)
            ->where('ano', $ano)
            ->where('sigiloso', false)
            ->with(['interessado', 'orgaoOrigem', 'orgaoAtual', 'andamentoAtual.tipoTramitacao', 'andamentos.tipoTramitacao', 'andamentos.orgaoOrigem', 'andamentos.orgaoDestino'])
            ->first();

        if ($processo === null) {
            return response()->json(['message' => 'Processo não encontrado ou com acesso restrito.'], 404);
        }

        // Validação opcional de documento do interessado (se informado, confirma correspondência)
        if ($request->filled('documento') && $processo->interessado !== null) {
            $docReq = preg_replace('/\D/', '', (string) $request->input('documento')) ?? '';
            $docInt = preg_replace('/\D/', '', (string) ($processo->interessado->cpf_cnpj ?? '')) ?? '';

            if ($docReq !== '' && !str_starts_with($docInt, $docReq)) {
                return response()->json(['message' => 'Documento do interessado divergente.'], 403);
            }
        }

        // Mascaramento LGPD do interessado via padrão MDM Pessoas
        $interessadoMascarado = null;
        if ($processo->interessado !== null) {
            $nome = $processo->interessado->nome ?? '';
            $interessadoMascarado = [
                'nome_mascarado' => strlen($nome) > 4 ? substr($nome, 0, 4) . '***' : '***',
                'cpf_cnpj_mascarado' => $processo->interessado->documento_mascarado,
            ];
        }

        $payload = [
            'id' => $processo->id,
            'numero' => $processo->numero,
            'ano' => $processo->ano,
            'numero_formatado' => $processo->numero_formatado,
            'tipo_processo' => $processo->tipo_processo,
            'assunto' => $processo->assunto,
            'status' => $processo->status,
            'origem' => $processo->origem,
            'orgao_origem' => $processo->orgaoOrigem?->name,
            'orgao_atual' => $processo->orgaoAtual?->name,
            'data_abertura' => $processo->data_abertura->toIso8601String(),
            'data_conclusao' => $processo->data_conclusao?->toIso8601String(),
            'interessado' => $interessadoMascarado,
            'andamentos' => $processo->andamentos->map(fn ($a) => [
                'sequencia' => $a->sequencia,
                'data_envio' => $a->data_envio?->toIso8601String(),
                'data_recebimento' => $a->data_recebimento?->toIso8601String(),
                'tipo' => $a->tipoTramitacao?->nome,
                'origem' => $a->orgaoOrigem?->name,
                'destino' => $a->orgaoDestino?->name,
                'descricao' => $a->descricao,
                'is_atual' => (bool) $a->and_atual,
            ]),
        ];

        return response()->json([
            'data' => $payload,
            ...$payload,
        ]);
    }
}

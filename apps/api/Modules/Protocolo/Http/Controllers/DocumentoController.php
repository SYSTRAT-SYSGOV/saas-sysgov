<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\AuditLogger;
use App\Support\OrgScope;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Protocolo\Http\Requests\StoreDocumentoRequest;
use Modules\Protocolo\Models\Documento;
use Modules\Protocolo\Models\Processo;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DocumentoController extends Controller
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

        $documentos = $processo->documentos()->with('criador')->get();

        return response()->json($documentos);
    }

    public function store(StoreDocumentoRequest $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para anexar documentos a este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $uploadedFile = $request->file('arquivo');
        $hash = hash_file('sha256', $uploadedFile->getRealPath());
        $ext = $uploadedFile->getClientOriginalExtension();
        $uuid = Str::uuid()->toString();
        $nomeSalvo = "{$uuid}.{$ext}";
        $ano = $processo->ano;

        $diretorio = "tenants/{$tenantId}/protocolo/{$ano}";
        $caminho = $uploadedFile->storeAs($diretorio, $nomeSalvo, 'local');

        $doc = Documento::create([
            'tenant_id' => $tenantId,
            'processo_id' => $processo->id,
            'tipo_documento' => $request->input('tipo_documento'),
            'nome_arquivo' => $request->input('nome_arquivo') ?? $uploadedFile->getClientOriginalName(),
            'caminho_arquivo' => $caminho,
            'hash_arquivo' => $hash,
            'tamanho_bytes' => $uploadedFile->getSize(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'application/octet-stream',
            'created_by' => $user?->id,
        ]);

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'documento.anexar',
            resource: "Documento #{$doc->id} no Processo #{$processo->id}",
            before: null,
            after: $doc->toArray(),
        );

        return response()->json($doc, 201);
    }

    public function download(Request $request, Documento $documento): StreamedResponse|JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($documento->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Documento não encontrado.'], 404);
        }

        $user = $request->user();
        $processo = $documento->processo;

        if ($processo !== null && $user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view')) {
                return response()->json(['message' => 'Sem permissão para visualizar este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
                && !$this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id)) {
                return response()->json(['message' => 'Processo fora do escopo da sua unidade.'], 403);
            }
        }

        if (!Storage::disk('local')->exists($documento->caminho_arquivo)) {
            return response()->json(['message' => 'Arquivo físico não encontrado no storage.'], 404);
        }

        return Storage::disk('local')->download(
            $documento->caminho_arquivo,
            $documento->nome_arquivo,
            [
                'X-SHA256' => $documento->hash_arquivo,
            ]
        );
    }

    public function destroy(Request $request, Processo $processo, Documento $documento): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId || $documento->tenant_id !== $tenantId || $documento->processo_id !== $processo->id) {
            return response()->json(['message' => 'Documento não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.update')) {
                return response()->json(['message' => 'Sem permissão para remover documentos deste processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Processo fora da posse da sua unidade.'], 403);
            }
        }

        $before = $documento->toArray();
        $documento->delete();

        $this->auditLogger->record(
            module: 'protocolo',
            action: 'documento.excluir',
            resource: "Documento #{$documento->id} no Processo #{$processo->id}",
            before: $before,
            after: null,
        );

        return response()->json(['message' => 'Documento removido com sucesso.']);
    }
}

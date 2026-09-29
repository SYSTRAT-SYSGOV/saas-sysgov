<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Http\Requests\DocumentoSucessaoRequest;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Services\SucessaoService;

final class SucessaoDocumentoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly SucessaoService $sucessao,
    ) {}

    public function store(DocumentoSucessaoRequest $request, int $id): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $processo = Sucessao::findOrFail($id);
        $dados = $request->validated();

        $documento = $this->sucessao->uploadDocumento($processo, $request->file('arquivo'), $dados['tipo']);

        return response()->json($documento, 201);
    }

    public function show(Request $request, int $id, int $documentoId): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $documento = SucessaoDocumento::where('sucessao_id', $id)->findOrFail($documentoId);

        return response()->json($documento);
    }

    public function download(Request $request, int $id, int $documentoId): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.view');

        $documento = SucessaoDocumento::where('sucessao_id', $id)->findOrFail($documentoId);

        $url = app(\Modules\Cemiterios\Services\DocumentoSucessaoService::class)->downloadUrl($documento);

        return response()->json([
            'download_url' => $url,
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
        ]);
    }

    public function destroy(Request $request, int $id, int $documentoId): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.sucessao.manage');

        $documento = SucessaoDocumento::where('sucessao_id', $id)->findOrFail($documentoId);
        $documento->delete();

        return response()->json(['message' => 'Documento removido com sucesso.']);
    }
}
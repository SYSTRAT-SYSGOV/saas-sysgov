<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Modules\Vistoria\Http\Requests\EmitirDocumentoRequest;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Services\DocumentoService;

final class DocumentoController extends Controller
{
    public function __construct(
        private readonly DocumentoService $service,
    ) {}

    public function store(EmitirDocumentoRequest $request, int $execucaoId): JsonResponse
    {
        $execucao = ExecucaoVistoria::findOrFail($execucaoId);

        try {
            $documento = $this->service->emitirDocumento($execucao, $request->validated('tipo'), $request->validated());

            return response()->json($documento, 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function pdf(int $id): StreamedResponse
    {
        $documento = Documento::with('execucao')->findOrFail($id);
        $this->authorize('view', $documento);

        return response()->streamDownload(
            fn () => print(Storage::disk('public')->get($documento->caminho_pdf)),
            "{$documento->tipo}-{$documento->numero_sequencial}-{$documento->exercicio}.pdf",
            ['Content-Type' => 'application/pdf'],
        );
    }
}

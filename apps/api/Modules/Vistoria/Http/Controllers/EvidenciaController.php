<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Modules\Vistoria\Http\Requests\AnexarEvidenciaRequest;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Services\EvidenciaService;

final class EvidenciaController extends Controller
{
    public function __construct(
        private readonly EvidenciaService $service,
    ) {}

    public function store(AnexarEvidenciaRequest $request, int $execucaoId): JsonResponse
    {
        $execucao = ExecucaoVistoria::findOrFail($execucaoId);

        try {
            $evidencia = $this->service->anexarDocumentoComplementar(
                $execucao,
                $request->file('arquivo'),
                $request->validated('categoria'),
                $request->validated('descricao'),
            );

            return response()->json($evidencia, 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Baixa o arquivo da evidência — a versão com marca d'água quando existir (fotos), senão o original. */
    public function arquivo(int $id): StreamedResponse
    {
        $evidencia = Evidencia::with('execucao')->findOrFail($id);
        $this->authorize('view', $evidencia);

        $caminho = $evidencia->caminho_processado ?? $evidencia->caminho_original;

        return response()->streamDownload(
            fn () => print(Storage::disk('public')->get($caminho)),
            basename($caminho),
            ['Content-Type' => $evidencia->mime_type ?? 'application/octet-stream'],
        );
    }
}

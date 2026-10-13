<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Vistoria\Http\Requests\ApresentarDefesaRequest;
use Modules\Vistoria\Http\Requests\ApresentarRecursoRequest;
use Modules\Vistoria\Http\Requests\JulgarProcessoRequest;
use Modules\Vistoria\Http\Requests\JulgarRecursoRequest;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;

final class ProcessoSancionatorioController extends Controller
{
    public function __construct(
        private readonly ProcessoSancionatorioService $service,
    ) {}

    public function show(int $id): JsonResponse
    {
        $processo = ProcessoSancionatorio::findOrFail($id);
        $this->authorize('view', $processo);

        return response()->json($processo);
    }

    public function defesa(ApresentarDefesaRequest $request, int $id): JsonResponse
    {
        $processo = ProcessoSancionatorio::findOrFail($id);

        try {
            return response()->json($this->service->apresentarDefesa($processo, $request->validated('texto')));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function julgamento(JulgarProcessoRequest $request, int $id): JsonResponse
    {
        $processo = ProcessoSancionatorio::findOrFail($id);

        try {
            $processo = $this->service->julgar(
                $processo,
                $request->validated('decisao'),
                $request->validated('fundamentacao'),
                $request->user(),
                $request->validated('penalidade_centavos') !== null ? (int) $request->validated('penalidade_centavos') : null,
                $request->validated('prazo_recurso_dias') !== null ? (int) $request->validated('prazo_recurso_dias') : null,
            );

            return response()->json($processo);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function recurso(ApresentarRecursoRequest $request, int $id): JsonResponse
    {
        $processo = ProcessoSancionatorio::findOrFail($id);

        try {
            return response()->json($this->service->apresentarRecurso($processo, $request->validated('texto')));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function julgamentoRecurso(JulgarRecursoRequest $request, int $id): JsonResponse
    {
        $processo = ProcessoSancionatorio::findOrFail($id);

        try {
            $processo = $this->service->julgarRecurso(
                $processo,
                $request->validated('decisao'),
                $request->validated('fundamentacao'),
                $request->user(),
            );

            return response()->json($processo);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}

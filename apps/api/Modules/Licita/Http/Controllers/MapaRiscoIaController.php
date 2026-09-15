<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiException;
use Illuminate\Http\JsonResponse;
use Modules\Licita\Models\MapaRisco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\MapaRiscoIaService;

final class MapaRiscoIaController extends Controller
{
    public function __construct(
        private readonly MapaRiscoIaService $service,
    ) {}

    public function sugerirRiscos(int $processoId): JsonResponse
    {
        // Mesma permissão de criar/editar o Mapa de Riscos — a sugestão não
        // grava nada, mas não faz sentido liberar pra quem não pode nem
        // editar o documento.
        $this->authorize('create', MapaRisco::class);

        $processo = Processo::findOrFail($processoId);

        try {
            $resultado = $this->service->sugerirRiscos($processo);
        } catch (AiException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($resultado);
    }
}

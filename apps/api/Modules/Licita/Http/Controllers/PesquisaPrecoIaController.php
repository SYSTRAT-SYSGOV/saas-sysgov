<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiException;
use Illuminate\Http\JsonResponse;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\PesquisaPrecoIaService;

final class PesquisaPrecoIaController extends Controller
{
    public function __construct(private readonly PesquisaPrecoIaService $service) {}

    public function sugerirCotacoes(int $processoId): JsonResponse
    {
        $processo = Processo::with('pesquisaPreco')->findOrFail($processoId);

        if ($processo->pesquisaPreco === null) {
            return response()->json(['error' => 'Cadastre a Pesquisa de Preços deste processo antes de buscar cotações.'], 422);
        }

        $this->authorize('update', $processo->pesquisaPreco);

        try {
            $resultado = $this->service->sugerirCotacoes($processo->pesquisaPreco);
        } catch (AiException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($resultado);
    }
}

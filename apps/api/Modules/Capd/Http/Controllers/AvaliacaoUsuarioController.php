<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Services\AvaliacaoUsuarioService;

/**
 * Avaliação pelo Usuário Externo (art. 25) — RF-06.
 *
 * Endpoints:
 *   POST /capd/avaliacao-usuario        — registra uma avaliação
 *   GET  /capd/avaliacao-usuario/media  — média agregada por servidor/ciclo
 */
final class AvaliacaoUsuarioController extends Controller
{
    public function __construct(
        private readonly AvaliacaoUsuarioService $service,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'servidor_id'      => ['required', 'integer', 'exists:capd_servidores,id'],
            'ciclo_id'         => ['required', 'integer', 'exists:capd_ciclos,id'],
            'nota_atendimento' => ['required', 'numeric', 'min:0', 'max:100'],
            'comentario'       => ['nullable', 'string'],
        ]);

        $avaliacao = $this->service->registrar(
            (int) $validated['servidor_id'],
            (int) $validated['ciclo_id'],
            (float) $validated['nota_atendimento'],
            $validated['comentario'] ?? null,
            $request->user()?->id !== null ? "user:{$request->user()->id}" : null,
        );

        return response()->json($avaliacao, 201);
    }

    public function media(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $validated = $request->validate([
            'servidor_id' => ['required', 'integer'],
            'ciclo_id'    => ['required', 'integer'],
        ]);

        $resultado = $this->service->mediaPorServidorCiclo((int) $validated['servidor_id'], (int) $validated['ciclo_id']);

        return response()->json($resultado);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Models\Dfd;
use Modules\Licita\Services\DfdIaService;

/**
 * Funcionalidades de IA do DFD. Mesma permissão de criar/editar um DFD
 * (`licita.create`/`licita.update` via DfdPolicy) — sugerir texto é parte do
 * fluxo de elaboração, não uma ação à parte.
 */
final class DfdIaController extends Controller
{
    public function __construct(
        private readonly DfdIaService $service,
    ) {}

    public function sugerirJustificativa(Request $request): JsonResponse
    {
        $this->authorize('create', Dfd::class);

        $data = $request->validate([
            'objeto' => ['required', 'string', 'max:500'],
            'area_requisitante' => ['nullable', 'string', 'max:255'],
            'itens' => ['sometimes', 'array'],
            'itens.*.descricao' => ['sometimes', 'string', 'max:1000'],
            // Justificativa já escrita (HTML do RichTextEditor) — quando
            // vem preenchido, o botão do front virou "Melhorar com IA": a
            // IA expande esse texto em vez de escrever do zero.
            'texto_atual' => ['sometimes', 'nullable', 'string', 'max:8000'],
        ]);

        try {
            $resultado = $this->service->sugerirJustificativa(
                $data['objeto'],
                $data['area_requisitante'] ?? null,
                $data['itens'] ?? [],
                $data['texto_atual'] ?? null,
            );
        } catch (AiException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($resultado);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Resposta;
use Modules\Requerimentos\Models\TramitacaoPoderes;
use Modules\Requerimentos\Services\RespostaService;

final class RespostaController extends Controller
{
    public function __construct(
        private readonly RespostaService $respostaService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'tramitacao_id'     => ['required', 'integer', 'exists:requerimentos_tramitacoes_poderes,id'],
            'conteudo'          => ['required', 'string'],
            'enviar_diretamente' => ['nullable', 'boolean'],
        ]);

        $tramitacao = TramitacaoPoderes::findOrFail($validated['tramitacao_id']);

        // Não há RespostaPolicy própria: responder a uma tramitação é a mesma permissão/regra de
        // tenant de "responder" a proposição dela (já definida em ProposicaoPolicy::responder).
        $this->authorize('responder', $tramitacao->proposicao);

        $resposta = $this->respostaService->elaborar($tramitacao, $validated, $user->id);

        return response()->json($resposta, 201);
    }

    public function enviar(int $id, Request $request): JsonResponse
    {
        $resposta = Resposta::findOrFail($id);

        $this->authorize('responder', $resposta->tramitacao->proposicao);

        try {
            $this->respostaService->enviar($resposta);
            return response()->json($resposta->fresh());
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
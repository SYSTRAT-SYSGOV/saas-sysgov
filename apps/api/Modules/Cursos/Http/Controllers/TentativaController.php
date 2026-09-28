<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Http\Resources\TentativaParticipanteResource;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Services\TentativaService;

/** Tentativas do participante: iniciar, responder, enviar e consultar. */
final class TentativaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly TentativaService $tentativas,
    ) {}

    public function iniciar(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $dados = $request->validate(['inscricao_id' => ['required', 'integer']]);
        $inscricao = Inscricao::query()->with(['turma', 'participante'])->findOrFail($dados['inscricao_id']);
        $this->authorize('iniciarTentativa', [$avaliacao, $inscricao]);

        return $this->executar(fn () => response()->json($this->apresentar($this->tentativas->iniciar($avaliacao, $inscricao)), 201));
    }

    public function show(Tentativa $tentativa): JsonResponse
    {
        $this->authorize('view', $tentativa);

        return response()->json($this->apresentar($this->tentativas->fecharSeVencida($tentativa)));
    }

    public function salvarResposta(Request $request, Tentativa $tentativa, int $questao): JsonResponse
    {
        $this->authorize('responder', $tentativa);
        $dados = $request->validate([
            'alternativa_id' => ['sometimes', 'nullable', 'integer'],
            'texto' => ['sometimes', 'nullable', 'string'],
        ]);

        return $this->executar(function () use ($tentativa, $questao, $dados): JsonResponse {
            $resposta = $this->tentativas->salvarResposta($tentativa, $questao, $dados);

            return response()->json([
                'questao_id' => $resposta->questao_id,
                'alternativa_id' => $resposta->alternativa_id,
                'texto' => $resposta->texto,
                'prazo_em' => $tentativa->prazo_em?->toIso8601String(),
                'servidor_agora' => now()->toIso8601String(),
            ]);
        });
    }

    public function enviar(Tentativa $tentativa): JsonResponse
    {
        $this->authorize('responder', $tentativa);

        return $this->executar(fn () => response()->json($this->apresentar($this->tentativas->enviar($tentativa))));
    }

    /**
     * @return array<string, mixed>
     */
    private function apresentar(Tentativa $tentativa): array
    {
        return (new TentativaParticipanteResource($tentativa->load(['avaliacao', 'respostas'])))->resolve();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Http\Resources\TentativaCorrecaoResource;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\CorrecaoService;

/** Correção de dissertativas pelo Administrador e pelo instrutor da turma. */
final class CorrecaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CorrecaoService $correcoes,
    ) {}

    public function fila(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);
        $status = StatusTentativa::tryFrom((string) $request->query('status', StatusTentativa::AguardandoCorrecao->value)) ?? StatusTentativa::AguardandoCorrecao;

        return response()->json($this->correcoes->fila($turma, $status)->map(fn (Tentativa $t): array => [
            'id' => $t->id,
            'avaliacao' => ['id' => $t->avaliacao->id, 'titulo' => $t->avaliacao->titulo],
            'participante' => ['id' => $t->inscricao->participante->id, 'nome' => $t->inscricao->participante->nome],
            'inscricao_id' => $t->inscricao_id,
            'numero' => $t->numero,
            'status' => $t->status,
            'enviada_em' => $t->enviada_em?->toIso8601String(),
            'nota' => $t->nota,
            'pendentes' => $this->correcoes->pendentes($t),
        ])->values());
    }

    public function show(Tentativa $tentativa): JsonResponse
    {
        $this->authorize('corrigir', $tentativa);

        return response()->json($this->apresentar($tentativa));
    }

    public function corrigir(Request $request, Tentativa $tentativa, int $questao): JsonResponse
    {
        $this->authorize('corrigir', $tentativa);
        $dados = $request->validate([
            'pontos' => ['required', 'numeric'],
            'comentario' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn () => response()->json($this->apresentar(
            $this->correcoes->corrigirResposta($tentativa, $questao, (float) $dados['pontos'], $dados['comentario'] ?? null, $request->user()),
        )));
    }

    /**
     * @return array<string, mixed>
     */
    private function apresentar(Tentativa $tentativa): array
    {
        return (new TentativaCorrecaoResource($tentativa->load(['avaliacao', 'inscricao.participante', 'respostas'])))->resolve();
    }
}

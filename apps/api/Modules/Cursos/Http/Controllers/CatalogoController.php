<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\InscricaoService;

/** Catálogo do participante: só cursos publicados, com as turmas abertas. */
final class CatalogoController extends Controller
{
    public function __construct(
        private readonly InscricaoService $inscricoes,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Curso::query()
            ->where('status', StatusCurso::Publicado->value)
            ->with(['turmas' => fn ($q) => $q->where('status', StatusTurma::Aberta->value)->orderBy('data_inicio')])
            ->orderBy('titulo');

        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', $tipo);
        }
        if ($busca = $request->query('busca')) {
            $query->where('titulo', 'like', '%' . $busca . '%');
        }

        $minhas = $this->minhasInscricoesAtivas($request);

        return response()->json($query->get()->map(fn (Curso $curso): array => [
            ...$curso->only(['id', 'tipo', 'titulo', 'descricao', 'carga_horaria_minutos', 'capa_url', 'frequencia_minima']),
            'turmas' => $curso->turmas->map(fn (Turma $t): array => $this->turma($t, $minhas))->values(),
        ]));
    }

    /**
     * @param array<int, Inscricao> $minhas turma_id => inscrição ativa do usuário
     * @return array<string, mixed>
     */
    private function turma(Turma $turma, array $minhas): array
    {
        $ocupadas = $this->inscricoes->vagasOcupadas($turma);
        $minha = $minhas[$turma->id] ?? null;

        return [
            ...$turma->only(['id', 'nome', 'data_inicio', 'data_fim', 'inscricoes_inicio', 'inscricoes_fim', 'vagas', 'modalidade', 'local', 'aprovacao_manual']),
            'vagas_restantes' => max(0, $turma->vagas - $ocupadas),
            'inscricoes_abertas' => now()->betweenIncluded($turma->inscricoes_inicio, $turma->inscricoes_fim),
            'minha_inscricao' => $minha === null ? null : [
                'id' => $minha->id,
                'status' => $minha->status,
                'posicao_fila' => $this->inscricoes->posicaoNaFila($minha),
            ],
        ];
    }

    /**
     * @return array<int, Inscricao>
     */
    private function minhasInscricoesAtivas(Request $request): array
    {
        $participante = Participante::query()->where('user_id', $request->user()->id)->first();
        if ($participante === null) {
            return [];
        }

        return Inscricao::query()
            ->where('participante_id', $participante->id)
            ->whereIn('status', StatusInscricao::valoresAtivos())
            ->get()
            ->keyBy('turma_id')
            ->all();
    }
}

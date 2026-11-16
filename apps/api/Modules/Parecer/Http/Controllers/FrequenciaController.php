<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Models\Frequencia;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\FrequenciaService;

/** Frequência diária (frequencia.php): grade por período (aba Alunos) e chamada do dia (aba Aulas). */
final class FrequenciaController extends Controller
{
    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly FrequenciaService $frequencias,
    ) {}

    /** Grade do período: trimestre (1–3) ou o ano todo. */
    public function grade(Request $request): JsonResponse
    {
        $turma = $this->turma($request);
        $periodos = $this->frequencias->periodos($turma->ano_letivo);
        $hoje = date('Y-m-d');
        $tri = (string) $request->query('tri', '');
        if ($tri === '') {
            $tri = 'ano';
            foreach ($periodos as $t => [$i, $f]) {
                if ($hoje >= $i && $hoje <= $f) {
                    $tri = (string) $t;
                }
            }
        }
        [$de, $ate] = $periodos[(int) $tri] ?? ["{$turma->ano_letivo}-01-01", "{$turma->ano_letivo}-12-31"];
        $registros = Frequencia::query()->where('turma_id', $turma->id)->whereDate('data', '>=', $de)->whereDate('data', '<=', $ate)->get(['aluno_id', 'data', 'status', 'aulas', 'faltas']);

        return response()->json([
            'tri' => $tri,
            'periodos' => $periodos,
            'dias' => $registros->map(fn (Frequencia $f): string => $f->data->format('Y-m-d'))->unique()->sort()->values(),
            'alunos' => Aluno::query()->with('contatos')->where('turma_id', $turma->id)->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->get()
                ->map(fn (Aluno $a): array => ['id' => $a->id, 'numero' => $a->numero, 'nome' => $a->nome, 'situacao' => $a->situacao, 'celular' => $a->contatos->sortBy('ordem')->first()?->telefone])->values(),
            'registros' => $registros->map(fn (Frequencia $f): array => ['aluno_id' => $f->aluno_id, 'data' => $f->data->format('Y-m-d'), 'status' => $f->status, 'aulas' => $f->aulas, 'faltas' => $f->faltas])->values(),
        ]);
    }

    /** Chamada de um dia e os dias já lançados no mês (calendário). */
    public function dia(Request $request): JsonResponse
    {
        $turma = $this->turma($request);
        $dados = $request->validate(['data' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'], 'mes' => ['nullable', 'date_format:Y-m']]);
        $mes = $dados['mes'] ?? substr($dados['data'], 0, 7);
        $salvo = Frequencia::query()->where('turma_id', $turma->id)->whereDate('data', $dados['data'])->get(['aluno_id', 'status', 'aulas'])->keyBy('aluno_id');

        return response()->json([
            'data' => $dados['data'],
            'mes' => $mes,
            'lancados' => Frequencia::query()->where('turma_id', $turma->id)->whereDate('data', '>=', "{$mes}-01")->whereDate('data', '<=', date('Y-m-t', (int) strtotime("{$mes}-01")))
                ->get(['data'])->map(fn (Frequencia $f): string => $f->data->format('Y-m-d'))->unique()->values(),
            'aulas' => $salvo->isNotEmpty() ? (int) $salvo->first()->aulas : 5,
            'salvo' => $salvo->isNotEmpty(),
            'pode_apagar' => $this->acesso->gestor($request->user()),
            'alunos' => Aluno::query()->with('contatos')->where('turma_id', $turma->id)->where('situacao', 'ativo')->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->get()
                ->map(fn (Aluno $a): array => ['id' => $a->id, 'numero' => $a->numero, 'nome' => $a->nome, 'tem_foto' => $a->foto_path !== null, 'celular' => $a->contatos->sortBy('ordem')->first()?->telefone, 'status' => $salvo[$a->id]->status ?? 'C'])->values(),
        ]);
    }

    public function registrar(Request $request): JsonResponse
    {
        $turma = $this->turma($request);
        $dados = $request->validate([
            'data' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'aulas' => ['required', 'integer', 'between:1,10'],
            'faltaram' => ['present', 'array'],
            'faltaram.*' => ['integer'],
        ]);
        $faltas = $this->frequencias->registrar($turma, $this->serie($turma), $dados['data'], (int) $dados['aulas'], array_map('intval', $dados['faltaram']), $request->user());

        return response()->json(['faltas' => $faltas]);
    }

    public function apagar(Request $request): JsonResponse
    {
        $turma = $this->turma($request);
        $this->acesso->exigirGestor($request->user());
        $dados = $request->validate(['data' => ['required', 'date_format:Y-m-d']]);

        return response()->json(['apagados' => $this->frequencias->apagar($turma, $this->serie($turma), $dados['data'])]);
    }

    private function turma(Request $request): Turma
    {
        $request->validate(['turma_id' => ['required', 'integer']]);
        $id = (int) $request->input('turma_id');
        $this->acesso->exigirTurma($request->user(), $id);

        return Turma::query()->findOrFail($id);
    }

    private function serie(Turma $turma): int
    {
        return (int) TurmaSerie::query()->where('turma_id', $turma->id)->value('serie');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\Observacao;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\AvaliacaoService;
use Modules\Parecer\Support\Catalogo;

/** Tela Avaliar (avaliar.php): conceitos por habilidade e observação, por trimestre e matéria. */
final class AvaliacaoController extends Controller
{
    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly AvaliacaoService $avaliacoes,
    ) {}

    public function show(Request $request, Aluno $aluno): JsonResponse
    {
        $user = $request->user();
        $this->acesso->exigirTurma($user, (int) $aluno->turma_id);
        $mats = $this->acesso->materiasDoUsuario($user, (int) $aluno->turma_id);
        abort_if($mats === [], 403, 'Você não avalia nenhuma matéria nesta turma.');
        $tri = (int) $request->integer('tri', 1);
        $tri = $tri < 0 || $tri > 3 ? 1 : $tri; // 0 = visão geral (só leitura)
        $materia = in_array($request->query('materia'), $mats, true) ? (string) $request->query('materia') : $mats[0];
        $serie = (int) TurmaSerie::query()->where('turma_id', $aluno->turma_id)->value('serie');

        $habs = Habilidade::query()->where('serie', $serie)->where('materia', $materia)->where('ativo', true)
            ->when($tri > 0, fn ($q) => $q->where('trimestres', 'like', "%{$tri}%"))->orderBy('ordem')->orderBy('id')->get(['id', 'descricao', 'trimestres', 'codigo_bncc']);
        $conceitos = [];
        foreach (Avaliacao::query()->where('aluno_id', $aluno->id)->get(['habilidade_id', 'trimestre', 'conceito']) as $v) {
            $conceitos[$v->habilidade_id][$v->trimestre] = $v->conceito;
        }

        // Progresso por matéria (feitos/total) no trimestre; na visão geral, habilidade × trimestres em que é trabalhada.
        $progresso = [];
        foreach (Habilidade::query()->where('serie', $serie)->where('ativo', true)->get(['id', 'materia', 'trimestres']) as $h) {
            foreach (str_split($h->trimestres) as $t) {
                if ($tri > 0 && (int) $t !== $tri) {
                    continue;
                }
                $progresso[$h->materia]['total'] = ($progresso[$h->materia]['total'] ?? 0) + 1;
                $progresso[$h->materia]['feitos'] = ($progresso[$h->materia]['feitos'] ?? 0) + (isset($conceitos[$h->id][(int) $t]) ? 1 : 0);
            }
        }

        // Outros trimestres só aparecem se alguma habilidade da lista é trabalhada nele e já tem avaliação.
        $colunas = [];
        foreach ([1, 2, 3] as $t) {
            if ($t === $tri || $habs->contains(fn (Habilidade $h): bool => str_contains($h->trimestres, (string) $t) && isset($conceitos[$h->id][$t]))) {
                $colunas[] = $t;
            }
        }
        $irmaos = Aluno::query()->where('turma_id', $aluno->turma_id)->where('situacao', 'ativo')->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->pluck('id')->all();
        $pos = array_search($aluno->id, $irmaos, true);
        $aluno->loadMissing('turma.turno', 'contatos');

        return response()->json([
            'aluno' => [
                'id' => $aluno->id, 'nome' => $aluno->nome, 'numero' => $aluno->numero, 'tem_foto' => $aluno->foto_path !== null,
                'nascimento' => $aluno->nascimentoDaPessoa()?->format('Y-m-d'), 'celular' => $aluno->contatos->sortBy('ordem')->first()?->telefone,
                'turma_id' => $aluno->turma_id, 'turma' => $aluno->turma?->nome, 'turno' => $aluno->turma?->turno?->nome, 'serie' => $serie,
            ],
            'tri' => $tri,
            'materia' => $materia,
            'materias' => $mats,
            'progresso' => $progresso,
            'colunas' => $colunas,
            'habilidades' => $habs->map(fn (Habilidade $h): array => [
                'id' => $h->id, 'descricao' => $h->descricao, 'trimestres' => $h->trimestres, 'conceitos' => $conceitos[$h->id] ?? (object) [],
            ])->values(),
            'observacao' => $tri > 0 ? (string) Observacao::query()->where('aluno_id', $aluno->id)->where('trimestre', $tri)->where('materia', $materia)->value('texto') : '',
            // Na visão Geral (tri 0), as observações dos três trimestres, só para leitura.
            'observacoes' => $tri === 0
                ? (object) Observacao::query()->where('aluno_id', $aluno->id)->where('materia', $materia)->whereIn('trimestre', [1, 2, 3])
                    ->where('texto', '!=', '')->orderBy('trimestre')->pluck('texto', 'trimestre')->all()
                : null,
            'anterior' => $pos !== false && $pos > 0 ? $irmaos[$pos - 1] : null,
            'proximo' => $pos !== false && isset($irmaos[$pos + 1]) ? $irmaos[$pos + 1] : null,
        ]);
    }

    public function salvar(Request $request, Aluno $aluno): JsonResponse
    {
        $user = $request->user();
        $this->acesso->exigirTurma($user, (int) $aluno->turma_id);
        $dados = $request->validate([
            'tri' => ['required', 'integer', 'between:1,3'],
            'materia' => ['required', Rule::in(array_keys(Catalogo::MATERIAS))],
            'conceitos' => ['array'],
            'conceitos.*' => ['nullable', Rule::in(['', ...array_keys(Catalogo::CONCEITOS)])],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ]);
        $this->acesso->exigirMateria($user, (int) $aluno->turma_id, $dados['materia']);
        $serie = (int) TurmaSerie::query()->where('turma_id', $aluno->turma_id)->value('serie');

        return response()->json($this->avaliacoes->salvar(
            $aluno, $serie, (int) $dados['tri'], $dados['materia'], $dados['conceitos'] ?? [],
            $request->has('observacao') ? (string) ($dados['observacao'] ?? '') : null, $user,
        ));
    }
}

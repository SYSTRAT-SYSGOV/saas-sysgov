<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Support\EscolaContext;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\ImpressaoService;
use Modules\Parecer\Support\Catalogo;

/** Dados das folhas do parecer (imprimir.php); o navegador imprime ou salva em PDF. */
final class ImpressaoController extends Controller
{
    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly ImpressaoService $impressao,
    ) {}

    public function __invoke(Request $request, EscolaContext $escola): JsonResponse
    {
        $d = $request->validate([
            'aluno_id' => ['required_without:turma_id', 'integer'],
            'turma_id' => ['required_without:aluno_id', 'integer'],
            'tri' => ['required', 'integer', 'between:0,3'],
            'materias' => ['nullable', 'array'],
            'materias.*' => [Rule::in(array_keys(Catalogo::MATERIAS))],
        ]);
        $user = $request->user();
        if (isset($d['turma_id'])) {
            $this->acesso->exigirTurma($user, (int) $d['turma_id']);
            $ids = Aluno::query()->where('turma_id', (int) $d['turma_id'])->where('situacao', 'ativo')->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->pluck('id')->all();
        } else {
            $aluno = Aluno::query()->findOrFail((int) $d['aluno_id']);
            $this->acesso->exigirTurma($user, (int) $aluno->turma_id);
            $ids = [$aluno->id];
        }
        $tris = (int) $d['tri'] === 0 ? [1, 2, 3] : [(int) $d['tri']];
        $esc = $escola->get();

        return response()->json([
            'escola' => ['id' => $esc->id, 'nome' => $esc->nome, 'tem_logo' => $esc->logo_path !== null],
            'folhas' => $this->impressao->folhas(array_map('intval', $ids), $tris, $d['materias'] ?? []),
        ]);
    }
}

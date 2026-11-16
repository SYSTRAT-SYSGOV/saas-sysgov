<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\RelatorioService;
use Modules\Parecer\Support\Catalogo;

/** Relatórios de conceitos (relatorios.php), limitados ao escopo do usuário. */
final class RelatorioController extends Controller
{
    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly RelatorioService $relatorios,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->acesso->pode($user, 'parecer.view'), 403);
        $d = $request->validate([
            'ano' => ['nullable', 'integer', 'between:2000,2100'],
            'tri' => ['nullable', 'integer', 'between:0,3'],
            'serie' => ['nullable', 'integer', 'between:0,5'],
            'turma' => ['nullable', 'integer'],
            'materia' => ['nullable', Rule::in(['', ...array_keys(Catalogo::MATERIAS)])],
            'aluno' => ['nullable', 'integer'],
        ]);
        $f = ['ano' => (int) ($d['ano'] ?? date('Y')), 'tri' => (int) ($d['tri'] ?? 0), 'serie' => (int) ($d['serie'] ?? 0), 'turma' => (int) ($d['turma'] ?? 0), 'materia' => (string) ($d['materia'] ?? '')];

        // Turmas da lista e escopo do professor: cada turma com as matérias que ele pode ver nela.
        $visiveis = $this->acesso->turmasDoUsuario($user);
        $turmas = TurmaSerie::query()->with('turma.turno')->get()
            ->filter(fn (TurmaSerie $c): bool => $c->turma !== null && $c->turma->ano_letivo === $f['ano'] && ($visiveis === null || in_array($c->turma_id, $visiveis, true)))
            ->sortBy(fn (TurmaSerie $c): string => $c->serie . '|' . $c->turma->nome)->values();
        $escopo = null;
        if ($visiveis !== null) {
            $escopo = [];
            foreach ($turmas as $c) {
                $escopo[$c->turma_id] = $this->acesso->materiasNoRelatorio($user, $c->turma_id);
            }
            if ($f['turma'] > 0 && !isset($escopo[$f['turma']])) {
                $f['turma'] = 0;
            }
            $matsVisiveis = $f['turma'] > 0 ? $escopo[$f['turma']] : array_values(array_unique(array_merge([], ...array_values($escopo))));
            if ($f['materia'] !== '' && !in_array($f['materia'], $matsVisiveis, true)) {
                $f['materia'] = '';
            }
        }

        $comparativo = null;
        if (!empty($d['aluno'])) {
            $aluno = Aluno::query()->find((int) $d['aluno']);
            if ($aluno !== null && $this->acesso->podeVerTurma($user, (int) $aluno->turma_id)) {
                $mats = $visiveis === null ? array_keys(Catalogo::MATERIAS) : ($escopo[$aluno->turma_id] ?? []);
                if ($f['materia'] !== '') {
                    $mats = array_values(array_intersect($mats, [$f['materia']]));
                }
                $comparativo = $this->relatorios->comparativo($f['ano'], $f['tri'], $aluno->id, $mats);
            }
        }

        return response()->json([
            'filtros' => $f,
            'turmas' => $turmas->map(fn (TurmaSerie $c): array => ['turma_id' => $c->turma_id, 'nome' => $c->turma->nome, 'serie' => $c->serie, 'turno' => $c->turma->turno?->nome])->values(),
            'materias_visiveis' => $escopo === null ? array_keys(Catalogo::MATERIAS) : array_values(array_unique(array_merge([], ...array_values($escopo)))),
            ...$this->relatorios->gerar($f, $escopo),
            'comparativo' => $comparativo,
        ]);
    }
}

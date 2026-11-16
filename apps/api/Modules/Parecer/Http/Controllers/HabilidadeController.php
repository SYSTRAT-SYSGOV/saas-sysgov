<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Parecer\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\BnccService;
use Modules\Parecer\Services\HabilidadeService;
use Modules\Parecer\Support\Catalogo;

/** Conteúdos por matéria (conteudos.php): gestor edita; professor consulta as séries e matérias das suas turmas. */
final class HabilidadeController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly HabilidadeService $habilidades,
        private readonly BnccService $bncc,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->acesso->pode($user, 'parecer.view'), 403);
        $this->habilidades->garantirPadrao();
        $visiveis = $this->visiveis($request);
        abort_if($visiveis === [], 403, 'Você não tem turmas com séries definidas.');
        $serie = (int) $request->integer('serie', (int) array_key_first($visiveis));
        $serie = isset($visiveis[$serie]) ? $serie : (int) array_key_first($visiveis);
        $materia = in_array($request->query('materia'), $visiveis[$serie], true) ? (string) $request->query('materia') : $visiveis[$serie][0];
        $habs = Habilidade::query()->where('serie', $serie)->where('materia', $materia)->orderBy('ordem')->orderBy('id')->get();
        $ativas = $habs->where('ativo', true);

        return response()->json([
            'serie' => $serie,
            'materia' => $materia,
            'visiveis' => $visiveis,
            'pode_editar' => $this->acesso->gestor($user),
            'bncc_configurada' => $this->bncc->configurada(),
            'contagem' => Habilidade::query()->where('serie', $serie)->where('ativo', true)->selectRaw('materia, COUNT(*) n')->groupBy('materia')->pluck('n', 'materia'),
            'por_trimestre' => array_map(fn (int $t): int => $ativas->filter(fn (Habilidade $h): bool => str_contains($h->trimestres, (string) $t))->count(), [1 => 1, 2 => 2, 3 => 3]),
            'habilidades' => $habs->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $this->validar($request, true);

        return $this->executar(fn (): JsonResponse => response()->json($this->habilidades->criar((int) $d['serie'], $d['materia'], $this->limpar($d['descricao']), $this->codigo($d['codigo_bncc'] ?? null), $d['trimestres']), 201));
    }

    public function update(Request $request, Habilidade $habilidade): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $this->validar($request, false);

        return $this->executar(fn (): JsonResponse => response()->json($this->habilidades->salvar($habilidade, $this->limpar($d['descricao']), $this->codigo($d['codigo_bncc'] ?? null), $d['trimestres'])));
    }

    public function trimestres(Request $request): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $request->validate([
            'serie' => ['required', 'integer', 'between:1,5'],
            'materia' => ['required', Rule::in(array_keys(Catalogo::MATERIAS))],
            'marcados' => ['required', 'array'],
            'marcados.*' => ['array'],
            'marcados.*.*' => ['integer', 'between:1,3'],
        ]);

        return response()->json($this->habilidades->salvarTrimestres((int) $d['serie'], $d['materia'], $d['marcados']));
    }

    public function ativo(Request $request, Habilidade $habilidade): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());

        return response()->json($this->habilidades->alternarAtivo($habilidade));
    }

    public function destroy(Request $request, Habilidade $habilidade): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());

        return $this->executar(function () use ($habilidade): JsonResponse {
            $this->habilidades->excluir($habilidade);

            return response()->json(['ok' => true]);
        });
    }

    public function mover(Request $request, Habilidade $habilidade): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $request->validate(['direcao' => ['required', Rule::in(['subir', 'descer'])]]);
        $this->habilidades->mover($habilidade, $d['direcao']);

        return response()->json(['ok' => true]);
    }

    public function copiar(Request $request): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $request->validate([
            'origem' => ['required', 'integer', 'between:1,5'],
            'serie' => ['required', 'integer', 'between:1,5'],
            'materia' => ['required', Rule::in(array_keys(Catalogo::MATERIAS))],
        ]);

        return $this->executar(fn (): JsonResponse => response()->json(['copiadas' => $this->habilidades->copiar((int) $d['origem'], (int) $d['serie'], $d['materia'])]));
    }

    public function bncc(Request $request): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $request->validate(['serie' => ['required', 'integer', 'between:1,5'], 'materia' => ['required', Rule::in(array_keys(Catalogo::MATERIAS))]]);
        $ja = Habilidade::query()->where('serie', $d['serie'])->where('materia', $d['materia'])->whereNotNull('codigo_bncc')->pluck('codigo_bncc')->all();

        return $this->executar(fn (): JsonResponse => response()->json(['itens' => $this->bncc->habilidades((int) $d['serie'], $d['materia']), 'ja_cadastrados' => $ja]));
    }

    public function adicionarBncc(Request $request): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $d = $request->validate([
            'serie' => ['required', 'integer', 'between:1,5'],
            'materia' => ['required', Rule::in(array_keys(Catalogo::MATERIAS))],
            'codigos' => ['required', 'array', 'min:1'],
            'codigos.*' => ['string', 'max:20'],
        ]);

        return $this->executar(function () use ($d): JsonResponse {
            // Dados buscados de novo no servidor: o texto da habilidade nunca vem do navegador.
            $oficiais = array_column($this->bncc->habilidades((int) $d['serie'], $d['materia']), null, 'codigo');

            return response()->json(['adicionadas' => $this->habilidades->adicionarDaBncc((int) $d['serie'], $d['materia'], $oficiais, $d['codigos'])]);
        });
    }

    /**
     * Séries e matérias visíveis: gestor vê tudo; professor, as séries das suas turmas e as suas matérias.
     *
     * @return array<int, list<string>>
     */
    private function visiveis(Request $request): array
    {
        $user = $request->user();
        if ($this->acesso->gestor($user)) {
            return array_fill_keys(array_keys(Catalogo::SERIES), array_keys(Catalogo::MATERIAS));
        }
        $visiveis = [];
        foreach (TurmaSerie::query()->whereIn('turma_id', $this->acesso->turmasDoUsuario($user) ?? [])->orderBy('serie')->get() as $c) {
            $visiveis[$c->serie] = array_values(array_intersect(array_keys(Catalogo::MATERIAS), [...($visiveis[$c->serie] ?? []), ...$this->acesso->materiasDoUsuario($user, $c->turma_id)]));
        }
        ksort($visiveis);

        return array_filter($visiveis);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, bool $criar): array
    {
        return $request->validate([
            'serie' => [$criar ? 'required' : 'sometimes', 'integer', 'between:1,5'],
            'materia' => [$criar ? 'required' : 'sometimes', Rule::in(array_keys(Catalogo::MATERIAS))],
            'descricao' => ['required', 'string', 'max:2000'],
            'codigo_bncc' => ['nullable', 'string', 'max:20'],
            'trimestres' => ['required', 'array', 'min:1'],
            'trimestres.*' => ['integer', 'between:1,3'],
        ], ['trimestres.required' => 'Marque pelo menos um trimestre em que a habilidade será trabalhada.']);
    }

    private function limpar(string $texto): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $texto));
    }

    private function codigo(?string $codigo): ?string
    {
        $c = strtoupper(trim((string) $codigo));

        return $c === '' ? null : $c;
    }
}

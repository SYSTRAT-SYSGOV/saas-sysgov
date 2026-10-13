<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Pesquisa;
use Modules\Campanha\Services\PesquisaService;

/** Pesquisas eleitorais com resultados estruturados e a evolução do candidato da campanha. */
final class PesquisaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly PesquisaService $pesquisas,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Pesquisa::class);
        $filtros = $request->validate(['codigo_ibge' => ['nullable', 'integer'], 'tipo' => ['nullable', Rule::in(['interna', 'externa'])]]);
        $lista = Pesquisa::query()->with('resultados')
            ->when(isset($filtros['codigo_ibge']), fn ($q) => (int) $filtros['codigo_ibge'] === 0 ? $q->whereNull('codigo_ibge') : $q->where('codigo_ibge', (int) $filtros['codigo_ibge']))
            ->when(!empty($filtros['tipo']), fn ($q) => $q->where('tipo', $filtros['tipo']))
            ->orderByDesc('divulgada_em')->orderByDesc('id')->get();

        return response()->json(['pesquisas' => $lista]);
    }

    public function evolucao(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Pesquisa::class);
        $ibge = $request->validate(['codigo_ibge' => ['nullable', 'integer']])['codigo_ibge'] ?? null;

        return response()->json(['pontos' => $this->pesquisas->evolucao($ibge ? (int) $ibge : null)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Pesquisa::class);
        [$dados, $resultados] = $this->validar($request, criar: true);

        return $this->executar(fn () => response()->json($this->pesquisas->salvar(null, $dados, $resultados), 201));
    }

    public function update(Request $request, Pesquisa $pesquisa): JsonResponse
    {
        $this->authorize('update', $pesquisa);
        [$dados, $resultados] = $this->validar($request, criar: false);

        return $this->executar(fn () => response()->json($this->pesquisas->salvar($pesquisa, $dados, $resultados)));
    }

    public function destroy(Pesquisa $pesquisa): JsonResponse
    {
        $this->authorize('delete', $pesquisa);
        $this->pesquisas->excluir($pesquisa);

        return response()->json(['deleted' => true]);
    }

    /** @return array{0: array<string, mixed>, 1: list<array{nome: string, partido?: string|null, percentual_decimos: int, da_campanha?: bool}>|null} */
    private function validar(Request $request, bool $criar): array
    {
        $o = $criar ? 'required' : 'sometimes';
        $dados = $request->validate([
            'tipo' => [$o, Rule::in(['interna', 'externa'])],
            'instituto' => [$o, 'string', 'max:200'],
            'divulgada_em' => [$o, 'date_format:Y-m-d'],
            'codigo_ibge' => ['sometimes', 'nullable', 'integer'],
            'margem_erro_decimos' => ['sometimes', 'integer', 'between:0,500'],
            'amostra' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'registro_tse' => ['sometimes', 'nullable', 'string', 'max:30'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'resultados' => [$o, 'array', 'max:40'],
            'resultados.*.nome' => ['required', 'string', 'max:200'],
            'resultados.*.partido' => ['nullable', 'string', 'max:30'],
            'resultados.*.percentual_decimos' => ['required', 'integer', 'between:0,1000'],
            'resultados.*.da_campanha' => ['sometimes', 'boolean'],
        ]);
        /** @var list<array{nome: string, partido?: string|null, percentual_decimos: int, da_campanha?: bool}>|null $resultados */
        $resultados = array_key_exists('resultados', $dados) ? array_values($dados['resultados']) : null;
        unset($dados['resultados']);

        return [$dados, $resultados];
    }
}

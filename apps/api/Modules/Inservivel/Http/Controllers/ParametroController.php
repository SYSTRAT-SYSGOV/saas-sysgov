<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Categoria;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Services\LotacaoService;
use Modules\Inservivel\Services\ParametrosService;
use Modules\OrgChart\Models\OrgUnit;

/** Parâmetros (categorias, situações, estados), substituição em massa e opções dos formulários (D2, D3). */
final class ParametroController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ParametrosService $parametros,
    ) {}

    /** Listas ativas, unidades do Organograma e papéis: tudo que os formulários do módulo precisam. */
    public function opcoes(): JsonResponse
    {
        $this->authorize('viewAny', Categoria::class);
        $lista = fn (string $classe) => $classe::query()->where('ativo', true)->orderBy('nome')->get(['id', 'nome'])
            ->map(fn ($i): array => ['id' => $i->id, 'nome' => $i->nome])->all();
        $unidades = OrgUnit::query()->where('is_active', true)->orderBy('path')
            ->get(['id', 'parent_id', 'name', 'acronym', 'type', 'path', 'level'])
            ->map(fn (OrgUnit $u): array => [
                'id' => $u->id, 'parent_id' => $u->parent_id, 'nome' => $u->name, 'sigla' => $u->acronym, 'tipo' => $u->type, 'path' => $u->path,
                'secretaria' => in_array($u->type, LotacaoService::TIPOS_SECRETARIA, true),
            ])->all();
        $situacoes = Situacao::query()->where('ativo', true)->orderBy('nome')->get()
            ->map(fn (Situacao $s): array => ['id' => $s->id, 'nome' => $s->nome, 'papel' => $s->papel?->value])->all();

        return response()->json([
            'categorias' => $lista(Categoria::class),
            'estados_conservacao' => $lista(EstadoConservacao::class),
            'situacoes' => $situacoes,
            'unidades' => $unidades,
        ]);
    }

    public function index(string $tipo): JsonResponse
    {
        return $this->executar(function () use ($tipo): JsonResponse {
            $classe = $this->parametros->modelo($tipo);
            $this->authorize('viewAny', $classe);
            $coluna = ['categorias' => 'categoria_id', 'situacoes' => 'situacao_id', 'estados-conservacao' => 'estado_conservacao_id'][$tipo];
            $usos = Bem::query()->selectRaw("{$coluna} as item_id, count(*) as total")->groupBy($coluna)->pluck('total', 'item_id');
            $itens = [];
            foreach ($classe::query()->orderBy('nome')->get() as $i) {
                $id = (int) $i->getKey();
                $itens[] = [
                    'id' => $id, 'nome' => (string) $i->getAttribute('nome'), 'ativo' => (bool) $i->getAttribute('ativo'),
                    'papel' => $i instanceof Situacao ? $i->papel?->value : null,
                    'bens' => (int) ($usos[$id] ?? 0),
                ];
            }

            return response()->json(['itens' => $itens]);
        });
    }

    public function store(Request $request, string $tipo): JsonResponse
    {
        return $this->executar(function () use ($request, $tipo): JsonResponse {
            $this->authorize('create', $this->parametros->modelo($tipo));
            $dados = $request->validate(['nome' => ['required', 'string', 'max:120'], 'ativo' => ['sometimes', 'boolean']]);

            return response()->json($this->parametros->salvar($tipo, null, $dados), 201);
        });
    }

    public function update(Request $request, string $tipo, int $id): JsonResponse
    {
        return $this->executar(function () use ($request, $tipo, $id): JsonResponse {
            $item = $this->parametros->modelo($tipo)::query()->findOrFail($id);
            $this->authorize('update', $item);
            $dados = $request->validate(['nome' => ['required', 'string', 'max:120'], 'ativo' => ['sometimes', 'boolean']]);

            return response()->json($this->parametros->salvar($tipo, $item, $dados));
        });
    }

    public function destroy(string $tipo, int $id): JsonResponse
    {
        return $this->executar(function () use ($tipo, $id): JsonResponse {
            $item = $this->parametros->modelo($tipo)::query()->findOrFail($id);
            $this->authorize('delete', $item);
            $this->parametros->excluir($tipo, $item);

            return response()->json(['deleted' => true]);
        });
    }

    public function substituir(Request $request): JsonResponse
    {
        $this->authorize('create', Situacao::class);
        $dados = $request->validate([
            'campo' => ['required', Rule::in(['situacao', 'estado_conservacao'])],
            'atual_id' => ['required', 'integer'],
            'novo_id' => ['required', 'integer'],
        ]);

        return $this->executar(fn (): JsonResponse => response()->json([
            'bens_alterados' => $this->parametros->substituirEmMassa($dados['campo'], (int) $dados['atual_id'], (int) $dados['novo_id']),
        ]));
    }
}

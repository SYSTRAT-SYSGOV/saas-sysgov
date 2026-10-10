<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Services\DemandaService;

/** Demandas da campanha de trabalho e "transformar em demanda" o pedido de um eleitor. */
final class DemandaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly DemandaService $demandas,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Demanda::class);
        $filtros = $request->validate([
            'codigo_ibge' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(Demanda::STATUS)],
            'prioridade' => ['nullable', Rule::in(Demanda::PRIORIDADES)],
            'responsavel_id' => ['nullable', 'integer'],
            'atrasadas' => ['nullable', 'boolean'],
        ]);
        $q = Demanda::query()->with('responsavel:id,name');
        foreach (['codigo_ibge', 'status', 'prioridade', 'responsavel_id'] as $campo) {
            if (!empty($filtros[$campo])) {
                $q->where($campo, $filtros[$campo]);
            }
        }
        if (!empty($filtros['atrasadas'])) {
            $q->whereNotNull('prazo')->where('prazo', '<', today()->toDateString())->where('status', '!=', 'concluida');
        }
        $lista = $q->orderByRaw("case prioridade when 'alta' then 0 when 'media' then 1 else 2 end")->orderBy('prazo')->orderByDesc('id')->get();

        return response()->json(['demandas' => $lista]);
    }

    public function responsaveis(): JsonResponse
    {
        $this->authorize('viewAny', Demanda::class);

        return response()->json(['responsaveis' => $this->demandas->responsaveis()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Demanda::class);

        return $this->executar(fn () => response()->json($this->demandas->salvar(null, $request->validate($this->regras()), $this->autor($request))->load('responsavel:id,name'), 201));
    }

    public function update(Request $request, Demanda $demanda): JsonResponse
    {
        $this->authorize('update', $demanda);

        return $this->executar(fn () => response()->json($this->demandas->salvar($demanda, $request->validate($this->regras(parcial: true)), $this->autor($request))->load('responsavel:id,name')));
    }

    public function destroy(Demanda $demanda): JsonResponse
    {
        $this->authorize('delete', $demanda);
        $this->demandas->excluir($demanda);

        return response()->json(['deleted' => true]);
    }

    public function doEleitor(Request $request, Eleitor $eleitor): JsonResponse
    {
        $this->authorize('create', Demanda::class);
        $this->authorize('view', $eleitor);
        $dados = $request->validate([
            'categoria' => ['sometimes', Rule::in(Demanda::CATEGORIAS)],
            'prioridade' => ['sometimes', Rule::in(Demanda::PRIORIDADES)],
            'responsavel_id' => ['sometimes', 'nullable', 'integer'],
            'prazo' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        return $this->executar(fn () => response()->json($this->demandas->doEleitor($eleitor, $dados, $this->autor($request))->load('responsavel:id,name'), 201));
    }

    /** @return array<string, mixed> */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'codigo_ibge' => [$obrigatorio, 'integer'],
            'solicitante' => [$obrigatorio, 'string', 'max:200'],
            'categoria' => [$obrigatorio, Rule::in(Demanda::CATEGORIAS)],
            'prioridade' => ['sometimes', Rule::in(Demanda::PRIORIDADES)],
            'responsavel_id' => ['sometimes', 'nullable', 'integer'],
            'prazo' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'status' => ['sometimes', Rule::in(Demanda::STATUS)],
            'descricao' => [$obrigatorio, 'string', 'max:5000'],
            'comentario' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    private function autor(Request $request): ?User
    {
        $user = $request->user();

        return $user instanceof User ? $user : null;
    }
}

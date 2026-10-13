<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Escola\Http\Requests\EnviarLogoRequest;
use Modules\Escola\Models\Escola;
use Modules\Escola\Services\EscolaService;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Escolas do órgão. Fora do middleware `escola` (é aqui que o usuário escolhe a escola de
 * trabalho): o cadastro exige escola.escolas.manage; "minhas" atende os quatro módulos.
 */
final class EscolaController extends Controller
{
    public function __construct(private readonly EscolaService $escolas) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Escola::class);

        return response()->json(['escolas' => $this->escolas->listar()]);
    }

    /** Unidades do organograma do órgão, para ligar a escola (lista plana, ordem da árvore). */
    public function unidadesOrganograma(): JsonResponse
    {
        $this->authorize('viewAny', Escola::class);

        return response()->json(['unidades' => OrgUnit::query()->orderBy('path')->get(['id', 'name', 'code', 'type', 'level', 'path'])]);
    }

    public function minhas(Request $request): JsonResponse
    {
        $modulo = (string) $request->query('modulo', 'escola');

        return response()->json(['escolas' => $this->escolas->minhas($request->user(), $modulo)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Escola::class);
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'inep' => ['nullable', 'string', 'max:20'],
            'org_unit_id' => ['required', 'integer'],
        ]);

        return $this->executar(fn () => response()->json($this->escolas->criar($dados), 201));
    }

    public function update(Request $request, Escola $escola): JsonResponse
    {
        $this->authorize('update', $escola);
        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:150'],
            'inep' => ['sometimes', 'nullable', 'string', 'max:20'],
            'org_unit_id' => ['sometimes', 'integer'],
            'ativa' => ['sometimes', 'boolean'],
        ]);

        return $this->executar(fn () => response()->json($this->escolas->atualizar($escola, $dados)));
    }

    public function logo(EnviarLogoRequest $request, Escola $escola): JsonResponse
    {
        $this->authorize('update', $escola);

        return response()->json($this->escolas->definirLogo($escola, $request->file('logo')));
    }

    /** @param callable(): JsonResponse $acao */
    private function executar(callable $acao): JsonResponse
    {
        try {
            return $acao();
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}

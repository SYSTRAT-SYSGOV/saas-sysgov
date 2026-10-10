<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\MunicipioCampanha;
use Modules\Campanha\Services\MunicipioService;
use Modules\Campanha\Services\PainelService;

/** Municípios da campanha de trabalho, ficha, mapa e painel (D5, D6). */
final class MunicipioController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly MunicipioService $municipios,
        private readonly PainelService $painel,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MunicipioCampanha::class);
        $filtros = $request->validate([
            'situacao' => ['sometimes', 'nullable', Rule::in(Campanha::SITUACOES)],
            'regiao' => ['sometimes', 'nullable', 'string', 'max:150'],
            'coordenador_id' => ['sometimes', 'nullable', 'integer'],
            'busca' => ['sometimes', 'nullable', 'string', 'max:150'],
        ]);

        return response()->json(['municipios' => $this->municipios->linhas($filtros)]);
    }

    public function show(int $codigoIbge): JsonResponse
    {
        $this->authorize('viewAny', MunicipioCampanha::class);

        return $this->executar(fn () => response()->json($this->municipios->ficha($codigoIbge)));
    }

    public function update(Request $request, int $codigoIbge): JsonResponse
    {
        $this->authorize('update', MunicipioCampanha::class);
        $dados = $request->validate([
            'situacao' => ['sometimes', Rule::in(Campanha::SITUACOES)],
            'meta_votos' => ['sometimes', 'integer', 'min:0'],
            'votos_anterior' => ['sometimes', 'integer', 'min:0'],
            'coordenador_id' => ['sometimes', 'nullable', 'integer'],
            'potencial' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'historico' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:10000'],
        ]);

        return $this->executar(fn () => response()->json($this->municipios->atualizar($codigoIbge, $dados)));
    }

    public function mapa(): JsonResponse
    {
        $this->authorize('viewAny', MunicipioCampanha::class);

        return response()->json(['municipios' => $this->painel->mapa()]);
    }

    public function painel(): JsonResponse
    {
        $this->authorize('viewAny', MunicipioCampanha::class);

        return response()->json($this->painel->painel());
    }
}

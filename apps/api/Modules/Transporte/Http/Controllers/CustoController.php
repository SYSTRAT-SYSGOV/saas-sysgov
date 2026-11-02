<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Custo\Parametros;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\CustoParametroService;
use Modules\Transporte\Services\CustoRotaService;
use Symfony\Component\HttpFoundation\Response;

/** Custos: ver exige `custos.ver`; alterar parâmetros exige `custos.parametros`. */
final class CustoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CustoParametroService $parametros,
        private readonly CustoRotaService $custos,
        private readonly TransportePolicy $policy,
    ) {}

    public function parametros(Request $request): JsonResponse
    {
        abort_unless($this->policy->verCustos($request->user()), 403);
        $ano = (int) $request->validate(['ano' => ['required', 'integer', 'between:2000,2100']])['ano'];

        return response()->json(['data' => ['ano' => $ano, 'grupos' => Parametros::GRUPOS, 'parametros' => $this->parametros->listar($ano)]]);
    }

    public function salvarParametros(Request $request): Response
    {
        abort_unless($this->policy->gerenciarParametrosCusto($request->user()), 403);
        $dados = $request->validate(['ano' => ['required', 'integer', 'between:2000,2100'], 'valores' => ['required', 'array', 'max:100']]);

        return $this->executar(function () use ($dados, $request): JsonResponse {
            $this->parametros->salvar((int) $dados['ano'], $dados['valores'], $request->user()?->id);

            return response()->json(['data' => ['ano' => (int) $dados['ano'], 'grupos' => Parametros::GRUPOS, 'parametros' => $this->parametros->listar((int) $dados['ano'])]]);
        });
    }

    public function copiar(Request $request): Response
    {
        abort_unless($this->policy->gerenciarParametrosCusto($request->user()), 403);
        $dados = $request->validate([
            'de' => ['required', 'integer', 'between:2000,2100'], 'para' => ['required', 'integer', 'between:2000,2100'], 'sobrescrever' => ['sometimes', 'boolean'],
        ]);

        return $this->executar(fn () => response()->json(['copiados' => $this->parametros->copiar((int) $dados['de'], (int) $dados['para'], (bool) ($dados['sobrescrever'] ?? false))]));
    }

    public function rotas(Request $request): Response
    {
        abort_unless($this->policy->verCustos($request->user()), 403);
        $filtros = $this->filtros($request);

        return $this->executar(fn () => response()->json(['data' => $this->custos->listar($filtros['ano'], $filtros)]));
    }

    public function rota(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->verCustos($request->user()), 403);
        $simular = $request->validate(['simular' => ['sometimes', 'array', 'max:50']])['simular'] ?? [];

        return $this->executar(fn () => response()->json(['data' => $this->custos->calcular($rota, $simular)]));
    }

    public function relatorio(Request $request): Response
    {
        abort_unless($this->policy->verCustos($request->user()), 403);
        $filtros = $this->filtros($request);

        return $this->executar(fn () => response()->json(['data' => $this->custos->relatorio($filtros['ano'], $filtros)]));
    }

    public function csv(Request $request): Response
    {
        abort_unless($this->policy->verCustos($request->user()), 403);
        $filtros = $this->filtros($request);

        return $this->executar(fn () => response($this->custos->csv($filtros['ano'], $filtros), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="transporte-custos-' . $filtros['ano'] . '.csv"',
        ]));
    }

    /** @return array{ano: int, escola_id?: int, empresa_id?: int, modal?: string} */
    private function filtros(Request $request): array
    {
        $d = $request->validate([
            'ano' => ['required', 'integer', 'between:2000,2100'], 'escola_id' => ['nullable', 'integer'], 'empresa_id' => ['nullable', 'integer'],
            'modal' => ['nullable', 'in:rodoviario,aquaviario'],
        ]);

        return array_filter(['ano' => (int) $d['ano'], 'escola_id' => $d['escola_id'] ?? null, 'empresa_id' => $d['empresa_id'] ?? null, 'modal' => $d['modal'] ?? null], static fn ($v): bool => $v !== null);
    }
}

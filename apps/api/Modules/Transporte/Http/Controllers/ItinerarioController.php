<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaParada;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ItinerarioService;
use Modules\Transporte\Support\Formata;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

final class ItinerarioController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ItinerarioService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request, Rota $rota): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);

        return response()->json(['data' => $this->lista($rota)]);
    }

    public function store(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate([
            'parada_id' => ['required', 'integer', Vinculos::existe('transporte_paradas')],
            'embarque_previsto' => ['nullable', 'date_format:H:i'],
            'desembarque_previsto' => ['nullable', 'date_format:H:i'],
        ]);

        return $this->executar(function () use ($rota, $dados): JsonResponse {
            $this->service->adicionar($rota, (int) $dados['parada_id'], $dados);

            return response()->json(['data' => $this->lista($rota)], 201);
        });
    }

    public function update(Request $request, Rota $rota, Parada $parada): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate([
            'embarque_previsto' => ['nullable', 'date_format:H:i'],
            'desembarque_previsto' => ['nullable', 'date_format:H:i'],
        ]);

        return $this->executar(function () use ($rota, $parada, $dados): JsonResponse {
            $this->service->atualizarHorarios($rota, $parada->id, $dados);

            return response()->json(['data' => $this->lista($rota)]);
        });
    }

    public function destroy(Request $request, Rota $rota, Parada $parada): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);

        return $this->executar(function () use ($rota, $parada): JsonResponse {
            $this->service->remover($rota, $parada->id);

            return response()->json(['data' => $this->lista($rota)]);
        });
    }

    public function reordenar(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate([
            'paradas' => ['present', 'array'],
            'paradas.*' => ['integer'],
        ]);

        return $this->executar(function () use ($rota, $dados): JsonResponse {
            $this->service->reordenar($rota, array_map('intval', $dados['paradas']));

            return response()->json(['data' => $this->lista($rota)]);
        });
    }

    /** @return list<array<string, mixed>> */
    private function lista(Rota $rota): array
    {
        return RotaParada::query()->with('parada')->where('rota_id', $rota->id)->orderBy('ordem')->get()
            ->map(fn (RotaParada $i): array => $this->formata->itinerario($i))->values()->all();
    }
}

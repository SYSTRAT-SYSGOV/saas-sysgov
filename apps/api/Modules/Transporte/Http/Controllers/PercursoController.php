<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Geo\LeitorKml;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\PercursoService;
use Symfony\Component\HttpFoundation\Response;

/** Percurso da rota importado de KML/KMZ. Ver exige `transporte.view`; importar e remover exigem gerenciar rotas. */
final class PercursoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly PercursoService $service, private readonly TransportePolicy $policy) {}

    public function previa(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $request->validate(['arquivo' => ['required', 'file', 'extensions:kml,kmz', 'max:' . intdiv(LeitorKml::MAX_BYTES, 1024)]]);

        return $this->executar(fn () => response()->json(['data' => $this->service->previa($request->file('arquivo'))]));
    }

    public function show(Request $request, Rota $rota): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);

        return response()->json(['data' => $this->service->obter($rota)]);
    }

    public function gravar(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);
        $dados = $request->validate([
            'coordenadas' => ['required', 'array', 'min:2', 'max:' . (PercursoService::PONTOS_GRAVADOS + 1000)],
            'coordenadas.*' => ['array', 'size:2'],
            'coordenadas.*.0' => ['numeric', 'between:-90,90'],
            'coordenadas.*.1' => ['numeric', 'between:-180,180'],
            'aplicar_km' => ['sometimes', 'boolean'],
            'km_nao_pavimentado' => ['nullable', 'numeric', 'min:0', 'max:999999.99', 'decimal:0,2'],
        ]);

        return $this->executar(fn () => response()->json(['data' => $this->service->gravar(
            $rota, $dados['coordenadas'], (bool) ($dados['aplicar_km'] ?? false), isset($dados['km_nao_pavimentado']) ? (float) $dados['km_nao_pavimentado'] : null, $request->user()?->id,
        )]));
    }

    public function destroy(Request $request, Rota $rota): Response
    {
        abort_unless($this->policy->gerenciarRotas($request->user()), 403);

        return $this->executar(function () use ($rota): JsonResponse {
            $this->service->remover($rota);

            return response()->json(['removido' => true]);
        });
    }
}

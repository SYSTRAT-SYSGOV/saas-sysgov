<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Capd\Services\PainelGerencialService;

/**
 * Controller do Painel Gerencial da Comissão CAPD com Filtros Avançados.
 */
final class PainelGerencialController extends Controller
{
    public function __construct(
        private readonly PainelGerencialService $painelService,
    ) {}

    public function servidores(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.dashboard.view'), 403);

        $perPage = (int) $request->query('per_page', 25);
        $filtros = $request->only([
            'org_unit_id',
            'secretaria',
            'cargo',
            'plano_carreira',
            'ciclo_id',
            'ano_competencia',
            'status_avaliacao',
            'faixa_nota',
            'nota_min',
            'nota_max',
            'avaliador_id',
            'servidor_id',
            'busca',
            'situacao_prazo',
        ]);

        $paginado = $this->painelService->listarServidoresComFiltros($filtros, $perPage);

        return response()->json($paginado);
    }

    public function kpis(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.dashboard.view'), 403);

        $cicloId = $request->query('ciclo_id') ? (int) $request->query('ciclo_id') : null;
        $kpis = $this->painelService->calcularKpis($cicloId);

        return response()->json($kpis);
    }

    public function visaoPerfil(Request $request, string $perfil): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.dashboard.view'), 403);

        $cicloId = $request->query('ciclo_id') ? (int) $request->query('ciclo_id') : null;
        $userId = (int) $request->user()?->id;

        try {
            $dados = $this->painelService->obterVisaoPerfil($perfil, $cicloId, $userId);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        return response()->json($dados);
    }

    public function relatorioAderencia(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.dashboard.view'), 403);

        $cicloId = (int) $request->query('ciclo_id');

        return response()->json($this->painelService->relatorioAderencia($cicloId));
    }

    public function exportar(Request $request): Response
    {
        abort_unless($request->user()->hasPermissionTo('capd.dashboard.view'), 403);

        $filtros = $request->only([
            'org_unit_id',
            'secretaria',
            'cargo',
            'plano_carreira',
            'ciclo_id',
            'ano_competencia',
            'status_avaliacao',
            'faixa_nota',
            'nota_min',
            'nota_max',
            'avaliador_id',
            'servidor_id',
            'busca',
            'situacao_prazo',
        ]);

        $csvContent = $this->painelService->exportarCsv($filtros);
        $filename = 'capd_painel_gerencial_' . now()->format('Ymd_His') . '.csv';

        return response($csvContent, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}

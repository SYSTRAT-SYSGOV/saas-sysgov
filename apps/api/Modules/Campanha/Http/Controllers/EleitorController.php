<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Services\EleitorService;

/** Base de eleitores da campanha de trabalho, indicadores e mapa de calor. */
final class EleitorController extends Controller
{
    private const POR_PAGINA = 50;

    public function __construct(
        private readonly EleitorService $eleitores,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Eleitor::class);
        $lista = $this->eleitores->listar($this->filtros($request));
        $pagina = max(1, (int) $request->query('pagina', '1'));

        return response()->json([
            'eleitores' => $lista->forPage($pagina, self::POR_PAGINA)->values(),
            'total' => $lista->count(),
            'pagina' => $pagina,
            'por_pagina' => self::POR_PAGINA,
        ]);
    }

    public function show(Eleitor $eleitor): JsonResponse
    {
        $this->authorize('view', $eleitor);

        return response()->json($this->eleitores->linha($eleitor->load(['coordenador', 'cabo'])));
    }

    public function indicadores(): JsonResponse
    {
        $this->authorize('indicadores', Eleitor::class);

        return response()->json($this->eleitores->indicadores());
    }

    public function mapaCalor(): JsonResponse
    {
        $this->authorize('indicadores', Eleitor::class);

        return response()->json(['pontos' => $this->eleitores->mapaCalor()]);
    }

    public function exportar(Request $request): StreamedResponse
    {
        $this->authorize('exportar', Eleitor::class);
        $linhas = $this->eleitores->exportar($this->filtros($request));

        return response()->streamDownload(function () use ($linhas): void {
            $saida = fopen('php://output', 'w');
            if ($saida === false) {
                return;
            }
            fwrite($saida, "\xEF\xBB\xBF");
            foreach ($linhas as $linha) {
                fputcsv($saida, $linha, ';', '"', '');
            }
            fclose($saida);
        }, 'eleitores-' . now()->format('Y-m-d') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function destroy(Eleitor $eleitor): JsonResponse
    {
        $this->authorize('delete', $eleitor);
        $this->eleitores->excluir($eleitor);

        return response()->json(['deleted' => true]);
    }

    /** @return array<string, mixed> */
    private function filtros(Request $request): array
    {
        return $request->validate([
            'codigo_ibge' => ['nullable', 'integer'],
            'bairro' => ['nullable', 'string', 'max:150'],
            'coordenador_id' => ['nullable', 'integer'],
            'cabo_id' => ['nullable', 'integer'],
            'link_id' => ['nullable', 'integer'],
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'busca' => ['nullable', 'string', 'max:100'],
        ]);
    }
}

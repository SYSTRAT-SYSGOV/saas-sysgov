<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Services\RelatorioAmbientalService;

final class RelatorioAmbientalController extends Controller
{
    public function __construct(
        private readonly RelatorioAmbientalService $relatorios,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', RelatorioAmbiental::class);

        $relatorios = RelatorioAmbiental::query()
            ->with('geradoPor:id,name')
            ->latest('id')
            ->get(['id', 'tipo', 'exercicio', 'gerado_por', 'created_at']);

        return response()->json(['data' => $relatorios->map(fn (RelatorioAmbiental $r): array => [
            'id' => $r->id,
            'tipo' => $r->tipo,
            'exercicio' => $r->exercicio,
            'gerado_por' => $r->geradoPor?->name,
            'gerado_em' => $r->created_at->toIso8601String(),
        ])]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', RelatorioAmbiental::class);

        $dados = $request->validate([
            'tipo' => ['required', Rule::in(RelatorioAmbiental::TIPOS_VALIDOS)],
            'exercicio' => ['required', 'integer', 'min:2000', 'max:' . now()->year],
        ]);

        $relatorio = $this->relatorios->gerarRelatorio($dados['tipo'], (int) $dados['exercicio'], $request->user()->id);

        return response()->json($this->paraJson($relatorio), 201);
    }

    public function show(RelatorioAmbiental $relatorioAmbiental): JsonResponse
    {
        $this->authorize('view', $relatorioAmbiental);

        return response()->json($this->paraJson($relatorioAmbiental));
    }

    public function exportar(Request $request, RelatorioAmbiental $relatorioAmbiental): Response
    {
        $this->authorize('view', $relatorioAmbiental);

        $formato = $request->validate([
            'formato' => ['required', Rule::in(RelatorioAmbiental::FORMATOS_VALIDOS)],
        ])['formato'];

        $arquivo = $this->relatorios->exportarRelatorio($relatorioAmbiental, $formato);

        return response($arquivo['conteudo'], 200, [
            'Content-Type' => $arquivo['content_type'],
            'Content-Disposition' => "attachment; filename=\"{$arquivo['nome_arquivo']}\"",
        ]);
    }

    /** @return array<string, mixed> */
    private function paraJson(RelatorioAmbiental $relatorio): array
    {
        return [
            'id' => $relatorio->id,
            'tipo' => $relatorio->tipo,
            'exercicio' => $relatorio->exercicio,
            'dados' => $relatorio->dados,
            'gerado_em' => $relatorio->created_at->toIso8601String(),
        ];
    }
}

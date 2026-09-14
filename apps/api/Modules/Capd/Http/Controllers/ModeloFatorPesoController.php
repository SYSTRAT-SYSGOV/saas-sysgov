<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\ModeloFatorPeso;
use Modules\Capd\Models\ModeloFormulario;

/**
 * Gestão de pesos por formulário (RF-02).
 *
 * O endpoint `sync` recebe a lista completa de {fator_id, peso} e
 * substitui atomicamente os pesos do modelo, validando soma = 100%.
 */
final class ModeloFatorPesoController extends Controller
{
    /** Lista pesos configurados no modelo com dados do fator. */
    public function index(int $modeloId): JsonResponse
    {
        $modelo = ModeloFormulario::findOrFail($modeloId);

        $pesos = ModeloFatorPeso::with('fator')
            ->where('modelo_id', $modelo->id)
            ->orderBy('ordem')
            ->get();

        // Soma atual para exibição no frontend
        $somaAtual = $pesos->where('ativo', true)->sum('peso');

        return response()->json([
            'modelo_id' => $modelo->id,
            'soma_pesos' => round($somaAtual, 2),
            'valido'    => abs($somaAtual - 100.0) < 0.01,
            'fatores'   => $pesos,
        ]);
    }

    /**
     * Sincroniza atomicamente os pesos do modelo.
     *
     * Recebe: [{ fator_id, peso, redistribuivel?, ordem? }, ...]
     * Valida: soma de todos os pesos ativos = 100% (RF-02).
     *
     * @example POST /modelos-formulario/{id}/fatores-pesos/sync
     *   Body: { "fatores": [{ "fator_id": 1, "peso": 15.00 }, ...] }
     */
    public function sync(Request $request, int $modeloId): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $modelo = ModeloFormulario::findOrFail($modeloId);

        $validated = $request->validate([
            'fatores'                    => ['required', 'array', 'min:1'],
            'fatores.*.fator_id'         => ['required', 'integer', 'exists:capd_fatores_avaliacao,id'],
            'fatores.*.peso'             => ['required', 'numeric', 'min:0.01', 'max:100'],
            'fatores.*.redistribuivel'   => ['nullable', 'boolean'],
            'fatores.*.ordem'            => ['nullable', 'integer', 'min:0'],
        ]);

        $fatores = collect($validated['fatores']);
        $soma    = $fatores->sum('peso');

        if (abs($soma - 100.0) > 0.01) {
            return response()->json([
                'message'    => 'RF-02: A soma dos pesos deve ser exatamente 100%. Soma atual: ' . number_format($soma, 2) . '%.',
                'soma_atual' => round($soma, 2),
            ], 422);
        }

        $pesos = DB::transaction(function () use ($modelo, $fatores): array {
            // Remove pesos anteriores do modelo
            ModeloFatorPeso::where('modelo_id', $modelo->id)->delete();

            $resultado = [];
            foreach ($fatores->values() as $idx => $item) {
                $resultado[] = ModeloFatorPeso::create([
                    'tenant_id'      => $modelo->tenant_id,
                    'modelo_id'      => $modelo->id,
                    'fator_id'       => (int) $item['fator_id'],
                    'peso'           => (float) $item['peso'],
                    'redistribuivel' => (bool) ($item['redistribuivel'] ?? false),
                    'ordem'          => (int) ($item['ordem'] ?? $idx),
                    'ativo'          => true,
                ]);
            }

            return $resultado;
        });

        return response()->json([
            'message'    => 'Pesos sincronizados com sucesso.',
            'soma_pesos' => round($soma, 2),
            'fatores'    => ModeloFatorPeso::with('fator')->where('modelo_id', $modelo->id)->orderBy('ordem')->get(),
        ]);
    }

    /** Lista os fatores disponíveis para associação (não vinculados ao modelo). */
    public function fatoresDisponiveis(int $modeloId): JsonResponse
    {
        $modelo = ModeloFormulario::findOrFail($modeloId);
        $fatoresVinculados = ModeloFatorPeso::where('modelo_id', $modelo->id)->pluck('fator_id');

        $disponiveis = FatorAvaliacao::ativos()
            ->whereNotIn('id', $fatoresVinculados)
            ->orderBy('ordem')
            ->get();

        return response()->json($disponiveis);
    }
}

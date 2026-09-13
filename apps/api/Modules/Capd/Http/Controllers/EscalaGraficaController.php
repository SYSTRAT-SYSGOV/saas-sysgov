<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\EscalaGrafica;
use Modules\Capd\Models\EscalaNivel;
use Modules\Capd\Models\ModeloFormulario;

/**
 * CRUD de Escalas Gráficas configuráveis (RF-03).
 *
 * Permite à Comissão criar/editar escalas com 3 a 5 níveis por modelo de formulário.
 */
final class EscalaGraficaController extends Controller
{
    /** Lista escalas de um modelo. */
    public function index(int $modeloId): JsonResponse
    {
        $modelo = ModeloFormulario::findOrFail($modeloId);

        $escalas = EscalaGrafica::with('niveis')
            ->where('modelo_id', $modelo->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($escalas);
    }

    /** Cria escala gráfica com seus níveis num único request. */
    public function store(Request $request, int $modeloId): JsonResponse
    {
        $modelo = ModeloFormulario::findOrFail($modeloId);

        $validated = $request->validate([
            'nome'                           => ['required', 'string', 'max:120'],
            'descricao'                      => ['nullable', 'string'],
            'niveis'                         => ['required', 'array', 'min:3', 'max:5'],
            'niveis.*.grau'                  => ['required', 'integer', 'min:1'],
            'niveis.*.rotulo'                => ['required', 'string', 'max:60'],
            'niveis.*.valor_min'             => ['required', 'numeric', 'min:0', 'max:100'],
            'niveis.*.valor_max'             => ['required', 'numeric', 'min:0', 'max:100'],
            'niveis.*.descricao_comportamental' => ['nullable', 'string'],
        ]);

        // Valida cobertura: primeiro nível começa em 0, último termina em 100
        $niveis = collect($validated['niveis'])->sortBy('grau');
        if ((float) $niveis->first()['valor_min'] !== 0.0) {
            return response()->json(['message' => 'O grau 1 deve iniciar em 0.'], 422);
        }
        if ((float) $niveis->last()['valor_max'] !== 100.0) {
            return response()->json(['message' => 'O último grau deve encerrar em 100.'], 422);
        }

        $escala = DB::transaction(function () use ($validated, $modelo, $niveis): EscalaGrafica {
            // Desativa outras escalas do mesmo modelo
            EscalaGrafica::where('modelo_id', $modelo->id)->update(['ativa' => false]);

            $escala = EscalaGrafica::create([
                'tenant_id'  => $modelo->tenant_id,
                'modelo_id'  => $modelo->id,
                'nome'       => $validated['nome'],
                'descricao'  => $validated['descricao'] ?? null,
                'qtd_niveis' => $niveis->count(),
                'ativa'      => true,
            ]);

            foreach ($niveis as $nivel) {
                EscalaNivel::create([
                    'escala_id'                => $escala->id,
                    'grau'                     => $nivel['grau'],
                    'rotulo'                   => $nivel['rotulo'],
                    'valor_min'                => $nivel['valor_min'],
                    'valor_max'                => $nivel['valor_max'],
                    'descricao_comportamental' => $nivel['descricao_comportamental'] ?? null,
                ]);
            }

            return $escala->load('niveis');
        });

        return response()->json($escala, 201);
    }

    /** Exibe escala com níveis. */
    public function show(int $modeloId, int $escalaId): JsonResponse
    {
        ModeloFormulario::findOrFail($modeloId);

        $escala = EscalaGrafica::with('niveis')
            ->where('modelo_id', $modeloId)
            ->findOrFail($escalaId);

        return response()->json($escala);
    }

    /** Atualiza escala e recria níveis. */
    public function update(Request $request, int $modeloId, int $escalaId): JsonResponse
    {
        ModeloFormulario::findOrFail($modeloId);

        $escala = EscalaGrafica::where('modelo_id', $modeloId)->findOrFail($escalaId);

        $validated = $request->validate([
            'nome'                              => ['sometimes', 'string', 'max:120'],
            'descricao'                         => ['nullable', 'string'],
            'ativa'                             => ['sometimes', 'boolean'],
            'niveis'                            => ['sometimes', 'array', 'min:3', 'max:5'],
            'niveis.*.grau'                     => ['required_with:niveis', 'integer', 'min:1'],
            'niveis.*.rotulo'                   => ['required_with:niveis', 'string', 'max:60'],
            'niveis.*.valor_min'                => ['required_with:niveis', 'numeric', 'min:0', 'max:100'],
            'niveis.*.valor_max'                => ['required_with:niveis', 'numeric', 'min:0', 'max:100'],
            'niveis.*.descricao_comportamental' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($escala, $validated): void {
            $escala->update(array_intersect_key($validated, array_flip(['nome', 'descricao', 'ativa'])));

            if (isset($validated['niveis'])) {
                $niveis = collect($validated['niveis'])->sortBy('grau');

                if ((float) $niveis->first()['valor_min'] !== 0.0 || (float) $niveis->last()['valor_max'] !== 100.0) {
                    throw new \DomainException('Níveis devem cobrir a faixa 0-100 sem gaps.');
                }

                $escala->niveis()->delete();

                foreach ($niveis as $nivel) {
                    EscalaNivel::create([
                        'escala_id'                => $escala->id,
                        'grau'                     => $nivel['grau'],
                        'rotulo'                   => $nivel['rotulo'],
                        'valor_min'                => $nivel['valor_min'],
                        'valor_max'                => $nivel['valor_max'],
                        'descricao_comportamental' => $nivel['descricao_comportamental'] ?? null,
                    ]);
                }

                $escala->update(['qtd_niveis' => $niveis->count()]);
            }
        });

        return response()->json($escala->load('niveis')->fresh());
    }

    /** Remove escala (soft delete). */
    public function destroy(int $modeloId, int $escalaId): JsonResponse
    {
        ModeloFormulario::findOrFail($modeloId);
        $escala = EscalaGrafica::where('modelo_id', $modeloId)->findOrFail($escalaId);
        $escala->delete();

        return response()->json(null, 204);
    }
}

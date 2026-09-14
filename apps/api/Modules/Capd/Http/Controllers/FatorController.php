<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Capd\Models\FatorAvaliacao;

/**
 * CRUD dinâmico de Fatores de Avaliação (RF-02).
 *
 * Permite à Comissão criar, editar e desativar fatores além do conjunto
 * F1-F8 padrão. A desativação nunca apaga o registro (DELETE seta
 * ativo=false), pois o fator pode estar referenciado por ModeloFatorPeso
 * e DiarioBordo — apagar quebraria o histórico e as chaves estrangeiras.
 *
 * IMPORTANTE: `peso_geral`/`peso_magisterio` NÃO alimentam mais o cálculo da
 * nota real — desde a migração para pesos por modelo de formulário (RF-02),
 * CalculadoraNotaService lê os pesos de ModeloFatorPeso (ver
 * ModeloFatorPesoController), não destes campos. Aqui eles servem apenas como
 * valor de referência sugerido ao criar um fator (usado por
 * CapdPerguntasPadraoSeeder como baseline inicial ao popular ModeloFatorPeso).
 * Para alterar o peso que efetivamente entra na NFD, use
 * POST /modelos-formulario/{id}/fatores-pesos/sync.
 */
final class FatorController extends Controller
{
    public function index(): JsonResponse
    {
        $fatores = FatorAvaliacao::query()->orderBy('ordem')->orderBy('codigo')->get();

        return response()->json($fatores);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $tenantId = app(\App\Support\TenantContext::class)->id();

        $validated = $request->validate([
            'codigo'          => ['required', 'string', 'max:10', Rule::unique('capd_fatores_avaliacao', 'codigo')->where('tenant_id', $tenantId)],
            'nome'            => ['required', 'string', 'max:100'],
            'descricao'       => ['required', 'string'],
            'automatizado'    => ['nullable', 'boolean'],
            'peso_geral'      => ['required', 'numeric', 'min:0', 'max:100'],
            'peso_magisterio' => ['required', 'numeric', 'min:0', 'max:100'],
            'ordem'           => ['nullable', 'integer', 'min:0'],
        ]);

        $fator = FatorAvaliacao::create([
            ...$validated,
            'ativo' => true,
        ]);

        // Mantém o fator no nível raiz da resposta (compatibilidade com consumidores
        // existentes), acrescentando só um aviso informativo sobre o peso real.
        return response()->json(array_merge($fator->toArray(), [
            '_aviso_peso' => 'peso_geral/peso_magisterio não afetam a nota real — configure o peso efetivo em POST /modelos-formulario/{id}/fatores-pesos/sync.',
        ]), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $fator    = FatorAvaliacao::findOrFail($id);
        $tenantId = app(\App\Support\TenantContext::class)->id();

        $validated = $request->validate([
            'codigo'          => ['sometimes', 'string', 'max:10', Rule::unique('capd_fatores_avaliacao', 'codigo')->where('tenant_id', $tenantId)->ignore($fator->id)],
            'nome'            => ['sometimes', 'string', 'max:100'],
            'descricao'       => ['sometimes', 'string'],
            'automatizado'    => ['sometimes', 'boolean'],
            'peso_geral'      => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'peso_magisterio' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'ordem'           => ['sometimes', 'integer', 'min:0'],
            'ativo'           => ['sometimes', 'boolean'],
        ]);

        $fator->update($validated);

        return response()->json($fator);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('capd.admin.parametrizar'), 403);

        $fator = FatorAvaliacao::findOrFail($id);
        $fator->update(['ativo' => false]);

        return response()->json(['message' => 'Fator desativado com sucesso.', 'fator' => $fator]);
    }
}

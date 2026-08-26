<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoPreco;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\MarketResearchService;

final class LicitacaoPrecosController extends Controller
{
    public function __construct(
        private readonly MarketResearchService $marketResearch,
        private readonly AuditHMACService $audit
    ) {}

    public function index(int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);
        $precos = LicitacaoPreco::where('licitacao_id', $licitacaoId)->get();
        $stats = $this->marketResearch->recalculateMarketPrices($licitacao);

        return response()->json([
            'precos' => $precos,
            'estatisticas' => $stats,
        ]);
    }

    public function store(Request $request, int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);

        $validated = $request->validate([
            'tipo_fonte' => ['required', 'string', 'in:banco_precos,pncp,contratacao_similar,cotacao'],
            'item_descricao' => ['required', 'string', 'max:255'],
            'fornecedor' => ['required', 'string', 'max:255'],
            'cnpj' => ['nullable', 'string', 'size:14'],
            'valor_cents' => ['required', 'integer', 'min:1'],
            'url_ref' => ['nullable', 'string', 'max:500'],
        ]);

        $preco = LicitacaoPreco::create(array_merge($validated, [
            'tenant_id' => $licitacao->tenant_id,
            'licitacao_id' => $licitacao->id,
            'status' => 'valida',
        ]));

        // Recalcula estatísticas e detecta outliers automaticamente (RN-004)
        $stats = $this->marketResearch->recalculateMarketPrices($licitacao);

        $this->audit->record(
            'procurement',
            'preco.added',
            "Fonte de preço cadastrada na Licitação #{$licitacao->id}",
            null,
            $preco->toArray()
        );

        return response()->json([
            'preco' => $preco->fresh(),
            'estatisticas' => $stats,
        ], 201);
    }

    public function destroy(int $licitacaoId, int $precoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);
        $preco = LicitacaoPreco::where('licitacao_id', $licitacaoId)->findOrFail($precoId);

        $before = $preco->toArray();
        $preco->delete();

        $stats = $this->marketResearch->recalculateMarketPrices($licitacao);

        $this->audit->record(
            'procurement',
            'preco.deleted',
            "Fonte de preço #{$precoId} removida",
            $before,
            null
        );

        return response()->json([
            'message' => 'Fonte de preço removida com sucesso.',
            'estatisticas' => $stats,
        ]);
    }
}

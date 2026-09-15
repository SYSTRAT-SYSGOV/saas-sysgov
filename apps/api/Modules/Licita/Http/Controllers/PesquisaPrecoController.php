<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\MetodoReferenciaPreco;
use Modules\Licita\Models\PesquisaPreco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\PesquisaPrecoService;

final class PesquisaPrecoController extends Controller
{
    public function __construct(
        private readonly PesquisaPrecoService $pesquisasPrecos,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', PesquisaPreco::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $pesquisaPreco = $this->pesquisasPrecos->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($pesquisaPreco, 201);
    }

    public function show(int $id): JsonResponse
    {
        $pesquisaPreco = PesquisaPreco::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $pesquisaPreco);

        return response()->json($pesquisaPreco);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pesquisaPreco = PesquisaPreco::findOrFail($id);
        $this->authorize('update', $pesquisaPreco);

        $data = $this->validatedData($request, partial: true);

        try {
            $pesquisaPreco = $this->pesquisasPrecos->atualizar($pesquisaPreco, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($pesquisaPreco);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        return $request->validate([
            'itens' => [...$required, 'array', 'min:1'],
            'itens.*.codigo' => ['required_with:itens', 'string', 'max:50'],
            'itens.*.descricao' => ['required_with:itens', 'string', 'max:1000'],
            'itens.*.unidade_medida' => ['required_with:itens', 'string', 'max:30'],
            'itens.*.quantidade' => ['required_with:itens', 'numeric', 'min:0.01'],
            'itens.*.tipo' => ['sometimes', 'nullable', 'in:material,servico'],
            'itens.*.cotacoes' => ['sometimes', 'array'],
            'itens.*.cotacoes.*.fonte' => ['required_with:itens.*.cotacoes', 'string', 'max:255'],
            'itens.*.cotacoes.*.fornecedor' => ['nullable', 'string', 'max:255'],
            'itens.*.cotacoes.*.valor_unitario' => ['required_with:itens.*.cotacoes', 'numeric', 'min:0'],
            'itens.*.cotacoes.*.data_cotacao' => ['nullable', 'date'],
            'itens.*.cotacoes.*.referencia' => ['nullable', 'string', 'max:500'],
            'metodo_referencia' => [...$required, 'in:' . implode(',', array_column(MetodoReferenciaPreco::cases(), 'value'))],
            'justificativa_metodo' => ['nullable', 'string', 'max:2000'],
            'equipe_planejamento' => ['sometimes', 'nullable', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
        ]);
    }
}

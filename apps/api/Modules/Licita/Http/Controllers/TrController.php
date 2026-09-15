<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\CriterioJulgamentoTr;
use Modules\Licita\Models\Processo;
use Modules\Licita\Models\Tr;
use Modules\Licita\Services\TrService;

final class TrController extends Controller
{
    public function __construct(
        private readonly TrService $trs,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', Tr::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $tr = $this->trs->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($tr, 201);
    }

    public function show(int $id): JsonResponse
    {
        $tr = Tr::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $tr);

        return response()->json($tr);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tr = Tr::findOrFail($id);
        $this->authorize('update', $tr);

        $data = $this->validatedData($request, partial: true);

        try {
            $tr = $this->trs->atualizar($tr, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($tr);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        // Todas as seções são opcionais mesmo na criação — o TR nasce vazio
        // e a equipe de planejamento preenche as seções progressivamente
        // (mesmo espírito de rascunho sempre editável das demais fases).
        return $request->validate([
            'fundamentacao_contratacao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'descricao_solucao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'requisitos_contratacao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'modelo_execucao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'modelo_gestao_contrato' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'criterio_julgamento' => ['sometimes', 'nullable', 'in:' . implode(',', array_column(CriterioJulgamentoTr::cases(), 'value'))],
            'obrigacoes_contratante' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'obrigacoes_contratada' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'sancoes_administrativas' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'vigencia_contrato' => ['sometimes', 'nullable', 'string', 'max:255'],
            'adequacao_orcamentaria' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'equipe_planejamento' => ['sometimes', 'nullable', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
        ]);
    }
}

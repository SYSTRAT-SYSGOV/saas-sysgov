<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\CriterioJulgamentoTr;
use Modules\Licita\Models\Edital;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\EditalService;

final class EditalController extends Controller
{
    public function __construct(
        private readonly EditalService $editais,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', Edital::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $edital = $this->editais->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($edital, 201);
    }

    public function show(int $id): JsonResponse
    {
        $edital = Edital::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $edital);

        return response()->json($edital);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $edital = Edital::findOrFail($id);
        $this->authorize('update', $edital);

        $data = $this->validatedData($request);

        try {
            $edital = $this->editais->atualizar($edital, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($edital);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        // Todas as seções são opcionais na validação de request — a
        // obrigatoriedade real é decidida pelo tenant (ver
        // CampoConfiguracaoService::CAMPOS_NATIVOS['edital'], nenhuma
        // obrigatória por padrão, mesmo espírito do TR) e checada em
        // EditalService::criar/atualizar via validarRespostas.
        return $request->validate([
            'preambulo' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'objeto' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'criterio_julgamento' => ['sometimes', 'nullable', 'in:' . implode(',', array_column(CriterioJulgamentoTr::cases(), 'value'))],
            'condicoes_participacao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'requisitos_habilitacao' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'procedimento_sessao_publica' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'prazo_recursal' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'sancoes_administrativas' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'disposicoes_gerais' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'equipe_planejamento' => ['sometimes', 'nullable', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
        ]);
    }
}

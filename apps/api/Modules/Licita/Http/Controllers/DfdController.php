<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Models\Dfd;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\DfdService;

final class DfdController extends Controller
{
    public function __construct(
        private readonly DfdService $dfds,
    ) {}

    public function store(Request $request, int $processoId): JsonResponse
    {
        $this->authorize('create', Dfd::class);

        $processo = Processo::findOrFail($processoId);
        $data = $this->validatedData($request);

        try {
            $dfd = $this->dfds->criar($processo, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($dfd, 201);
    }

    public function show(int $id): JsonResponse
    {
        $dfd = Dfd::with(['elaborador', 'aprovador', 'versoes.usuario', 'processo'])->findOrFail($id);
        $this->authorize('view', $dfd);

        return response()->json($dfd);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $dfd = Dfd::findOrFail($id);
        $this->authorize('update', $dfd);

        $data = $this->validatedData($request, partial: true);

        try {
            $dfd = $this->dfds->atualizar($dfd, $data, $request->user());
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($dfd);
    }

    public function enviarRevisao(Request $request, int $id): JsonResponse
    {
        $dfd = Dfd::findOrFail($id);
        $this->authorize('update', $dfd);

        $mensagem = $request->validate(['mensagem' => ['nullable', 'string', 'max:1000']])['mensagem'] ?? null;

        try {
            $dfd = $this->dfds->enviarParaRevisao($dfd, $request->user(), $mensagem);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($dfd);
    }

    public function aprovar(Request $request, int $id): JsonResponse
    {
        $dfd = Dfd::findOrFail($id);
        $this->authorize('aprovar', $dfd);

        $parecer = $request->validate(['parecer' => ['nullable', 'string', 'max:1000']])['parecer'] ?? null;

        try {
            $dfd = $this->dfds->aprovar($dfd, $request->user(), $parecer);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($dfd);
    }

    public function rejeitar(Request $request, int $id): JsonResponse
    {
        $dfd = Dfd::findOrFail($id);
        $this->authorize('rejeitar', $dfd);

        $motivo = $request->validate(['motivo' => ['required', 'string', 'max:1000']])['motivo'];

        try {
            $dfd = $this->dfds->rejeitar($dfd, $request->user(), $motivo);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($dfd);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'data_previsao' => [$required, 'date'],
            'grau_prioridade' => [$required, 'in:' . implode(',', array_column(GrauPrioridade::cases(), 'value'))],
            'justificativa' => [$required, 'string', 'max:3000'],
            'objeto' => [$required, 'string', 'max:500'],
            'previsao_pca' => ['sometimes', 'boolean'],
            'numero_pca' => ['nullable', 'string', 'max:50'],
            'area_requisitante' => ['nullable', 'string', 'max:255'],
            'equipe_planejamento' => ['sometimes', 'array'],
            'equipe_planejamento.*.nome' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.cargo' => ['required_with:equipe_planejamento', 'string', 'max:255'],
            'equipe_planejamento.*.matricula' => ['required_with:equipe_planejamento', 'string', 'max:50'],
            'campos_extras' => ['sometimes', 'array'],
        ]);
    }
}

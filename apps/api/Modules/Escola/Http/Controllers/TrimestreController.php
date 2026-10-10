<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Escola\Http\Requests\SalvarTrimestreRequest;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Services\TrimestreService;

final class TrimestreController extends Controller
{
    public function __construct(private readonly TrimestreService $trimestres) {}

    /** Ano mais recente primeiro, trimestres em ordem; cada um com a situação calculada. */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Trimestre::class);

        return response()->json(Trimestre::query()->orderByDesc('ano_letivo')->orderBy('numero')->get());
    }

    public function store(SalvarTrimestreRequest $request): JsonResponse
    {
        /** @var array{ano_letivo: int, numero: int, data_inicio: string, data_fim: string} $dados */
        $dados = $request->validated();

        return response()->json($this->trimestres->criar($dados), 201);
    }

    public function update(SalvarTrimestreRequest $request, Trimestre $trimestre): JsonResponse
    {
        /** @var array{ano_letivo: int, numero: int, data_inicio: string, data_fim: string} $dados */
        $dados = $request->validated();

        return response()->json($this->trimestres->atualizar($trimestre, $dados));
    }

    public function destroy(Trimestre $trimestre): JsonResponse
    {
        $this->authorize('delete', $trimestre);
        $this->trimestres->excluir($trimestre);

        return response()->json(['deleted' => true]);
    }
}

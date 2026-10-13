<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Pedagogico\Http\Requests\SalvarCronogramaRequest;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Services\CronogramaService;

final class CronogramaController extends Controller
{
    public function __construct(private readonly CronogramaService $cronogramas) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Cronograma::class);

        return response()->json(Cronograma::query()->orderByDesc('ano_letivo')->orderByDesc('data_inicio')->get());
    }

    /** Período vigente: ativo hoje, senão o mais próximo no ano corrente, senão o mais próximo em qualquer ano. */
    public function vigente(): JsonResponse
    {
        $this->authorize('viewAny', Cronograma::class);

        return response()->json($this->cronogramas->vigente());
    }

    public function store(SalvarCronogramaRequest $request): JsonResponse
    {
        /** @var array{ano_letivo: int, periodo: int, data_inicio: string, data_fim: string} $dados */
        $dados = $request->validated();

        return response()->json($this->cronogramas->criar($dados), 201);
    }

    public function update(SalvarCronogramaRequest $request, Cronograma $cronograma): JsonResponse
    {
        /** @var array{ano_letivo: int, periodo: int, data_inicio: string, data_fim: string} $dados */
        $dados = $request->validated();

        return response()->json($this->cronogramas->atualizar($cronograma, $dados));
    }

    public function destroy(Cronograma $cronograma): JsonResponse
    {
        $this->authorize('delete', $cronograma);
        $this->cronogramas->excluir($cronograma);

        return response()->json(['deleted' => true]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Escola\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Escola\Http\Requests\SalvarTurnoRequest;
use Modules\Escola\Models\Turno;
use Modules\Escola\Services\TurnoService;

final class TurnoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly TurnoService $turnos) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Turno::class);

        return response()->json($this->turnos->listar());
    }

    public function store(SalvarTurnoRequest $request): JsonResponse
    {
        return response()->json($this->turnos->criar($request->validated()), 201);
    }

    public function update(SalvarTurnoRequest $request, Turno $turno): JsonResponse
    {
        return response()->json($this->turnos->atualizar($turno, $request->validated()));
    }

    public function destroy(Turno $turno): JsonResponse
    {
        $this->authorize('delete', $turno);

        return $this->executar(function () use ($turno): JsonResponse {
            $this->turnos->excluir($turno);

            return response()->json(['deleted' => true]);
        });
    }
}

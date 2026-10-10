<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Pedagogico\Enums\StatusAta;
use Modules\Pedagogico\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Pedagogico\Http\Requests\SalvarAtaRequest;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Services\AtaService;
use Modules\Pedagogico\Services\EscopoProfessor;

final class AtaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AtaService $atas,
        private readonly EscopoProfessor $escopo,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ata::class);

        $atas = $this->escopo->aplicar(Ata::query(), $request->user())
            ->with('turma:id,nome')
            ->when($request->query('turma_id'), fn ($q, $v) => $q->where('turma_id', (int) $v))
            ->when($request->query('ano_letivo'), fn ($q, $v) => $q->where('ano_letivo', (int) $v))
            ->when($request->query('status'), fn ($q, $v) => $q->where('status', (string) $v))
            ->orderByDesc('data_reuniao')
            ->get();

        return response()->json($atas);
    }

    public function store(SalvarAtaRequest $request): JsonResponse
    {
        return response()->json($this->atas->criar($request->validated(), $request->user()), 201);
    }

    public function show(Ata $ata): JsonResponse
    {
        $this->authorize('view', $ata);

        return response()->json($ata->load('turma:id,nome'));
    }

    public function update(SalvarAtaRequest $request, Ata $ata): JsonResponse
    {
        return $this->executar(fn (): JsonResponse => response()->json($this->atas->atualizar($ata, $request->validated())));
    }

    public function finalizar(Ata $ata): JsonResponse
    {
        $this->authorize('update', $ata);

        return $this->executar(fn (): JsonResponse => response()->json($this->atas->alterarStatus($ata, StatusAta::Finalizada)));
    }

    public function arquivar(Ata $ata): JsonResponse
    {
        $this->authorize('update', $ata);

        return $this->executar(fn (): JsonResponse => response()->json($this->atas->alterarStatus($ata, StatusAta::Arquivada)));
    }

    public function destroy(Ata $ata): JsonResponse
    {
        $this->authorize('delete', $ata);

        return $this->executar(function () use ($ata): JsonResponse {
            $this->atas->excluir($ata);

            return response()->json(['deleted' => true]);
        });
    }
}

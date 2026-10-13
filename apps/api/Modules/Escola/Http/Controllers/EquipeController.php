<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Escola\Http\Requests\SalvarMembroEquipeRequest;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Services\EquipeService;

final class EquipeController extends Controller
{
    public function __construct(private readonly EquipeService $equipe) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', MembroEquipe::class);

        return response()->json($this->equipe->listar());
    }

    public function store(SalvarMembroEquipeRequest $request): JsonResponse
    {
        /** @var array{nome: string, cargo: string, ordem?: int} $dados */
        $dados = $request->validated();

        return response()->json($this->equipe->criar($dados), 201);
    }

    public function update(SalvarMembroEquipeRequest $request, MembroEquipe $membro): JsonResponse
    {
        /** @var array{nome?: string, cargo?: string, ordem?: int} $dados */
        $dados = $request->validated();

        return response()->json($this->equipe->atualizar($membro, $dados));
    }

    public function destroy(MembroEquipe $membro): JsonResponse
    {
        $this->authorize('delete', $membro);
        $this->equipe->excluir($membro);

        return response()->json(['deleted' => true]);
    }
}

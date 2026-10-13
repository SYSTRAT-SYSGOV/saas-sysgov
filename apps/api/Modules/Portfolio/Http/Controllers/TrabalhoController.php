<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Modules\Escola\Models\Aluno;
use Modules\Portfolio\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Portfolio\Http\Requests\SalvarTrabalhoRequest;
use Modules\Portfolio\Http\Resources\TrabalhoResource;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\EscopoPortfolio;
use Modules\Portfolio\Services\TrabalhoService;

final class TrabalhoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly TrabalhoService $trabalhos) {}

    public function store(SalvarTrabalhoRequest $request, Aluno $aluno): JsonResponse
    {
        abort_unless($this->escopo()->podeVerAluno($request->user(), $aluno), 404);

        return $this->executar(function () use ($request, $aluno): JsonResponse {
            $trabalho = $this->trabalhos->criar($aluno, $request->validated(), $request->user());

            return response()->json(['data' => (new TrabalhoResource($trabalho->load(['turma', 'materia', 'autor', 'imagens'])))->resolve($request)], 201);
        });
    }

    public function update(SalvarTrabalhoRequest $request, Trabalho $trabalho): JsonResponse
    {
        abort_unless(Gate::allows('view', $trabalho), 404);

        return $this->executar(fn (): JsonResponse => response()->json(['data' => (new TrabalhoResource(
            $this->trabalhos->atualizar($trabalho, $request->validated(), $request->user())->load(['turma', 'materia', 'autor', 'imagens'])
        ))->resolve($request)]));
    }

    public function destroy(Request $request, Trabalho $trabalho): JsonResponse
    {
        abort_unless(Gate::allows('view', $trabalho), 404);
        $this->authorize('delete', $trabalho);
        $this->trabalhos->excluir($trabalho);

        return response()->json(['deleted' => true]);
    }

    private function escopo(): EscopoPortfolio
    {
        return EscopoPortfolio::daRequisicao();
    }
}

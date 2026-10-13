<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Passeio\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Passeio\Http\Requests\OcuparAssentoRequest;
use Modules\Passeio\Http\Requests\SalvarVeiculoRequest;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Services\FrotaService;

final class FrotaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly FrotaService $frota) {}

    public function index(Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);

        return response()->json(Veiculo::query()->where('passeio_id', $passeio->id)->withCount('assentos')->orderBy('id')->get());
    }

    public function store(SalvarVeiculoRequest $request, Passeio $passeio): JsonResponse
    {
        $this->authorize('view', $passeio);

        return response()->json($this->frota->criarVeiculo($passeio, $request->validated()), 201);
    }

    public function update(SalvarVeiculoRequest $request, Veiculo $veiculo): JsonResponse
    {
        return response()->json($this->frota->atualizarVeiculo($veiculo, $request->validated()));
    }

    public function destroy(Veiculo $veiculo): JsonResponse
    {
        $this->authorize('delete', $veiculo);
        $this->frota->excluirVeiculo($veiculo);

        return response()->json(['deleted' => true]);
    }

    /** Mapa: capacidade e assentos ocupados (número, aluno). */
    public function assentos(Veiculo $veiculo): JsonResponse
    {
        $this->authorize('view', $veiculo);

        return response()->json([
            'veiculo_id' => $veiculo->id,
            'capacidade' => $veiculo->capacidade,
            'ocupados' => Assento::query()->where('veiculo_id', $veiculo->id)->with('aluno:id,nome,turma_id', 'aluno.turma:id,nome')->orderBy('numero')->get()
                ->map(fn (Assento $a): array => ['numero' => $a->numero, 'aluno_id' => $a->aluno_id, 'aluno' => $a->aluno?->nome, 'turma' => $a->aluno?->turma?->nome])
                ->values(),
        ]);
    }

    public function ocupar(OcuparAssentoRequest $request, Veiculo $veiculo, int $numero): JsonResponse
    {
        return $this->executar(fn (): JsonResponse => response()->json($this->frota->ocupar($veiculo, $numero, $request->integer('aluno_id'))));
    }

    public function liberar(Veiculo $veiculo, int $numero): JsonResponse
    {
        $this->authorize('update', $veiculo);
        $this->frota->liberar($veiculo, $numero);

        return response()->json(['liberado' => true]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Modules\Escola\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Escola\Http\Requests\ImportarMateriasRequest;
use Modules\Escola\Http\Requests\SalvarMateriaRequest;
use Modules\Escola\Http\Resources\MateriaResource;
use Modules\Escola\Models\Materia;
use Modules\Escola\Services\MateriaService;
use Modules\Escola\Support\LeitorCsv;

final class MateriaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly MateriaService $materias) {}

    /** Matérias com as turmas vinculadas a cada uma. */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Materia::class);

        return response()->json(MateriaResource::collection(Materia::query()->with('vinculos.turma')->orderBy('nome')->get()));
    }

    public function store(SalvarMateriaRequest $request): JsonResponse
    {
        return response()->json(new MateriaResource($this->materias->criar($request->validated('nome'))), 201);
    }

    public function update(SalvarMateriaRequest $request, Materia $materia): JsonResponse
    {
        return response()->json(new MateriaResource($this->materias->atualizar($materia, $request->validated('nome'))));
    }

    public function destroy(Materia $materia): JsonResponse
    {
        $this->authorize('delete', $materia);
        $this->materias->excluir($materia);

        return response()->json(['deleted' => true]);
    }

    public function exportar(): Response
    {
        $this->authorize('viewAny', Materia::class);

        return response($this->materias->exportar(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="materias_cadastradas.csv"',
        ]);
    }

    public function importar(ImportarMateriasRequest $request): JsonResponse
    {
        return $this->executar(fn (): JsonResponse => response()->json(
            $this->materias->importar(LeitorCsv::de($request->file('arquivo')))
        ));
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\AulaService;

final class AulaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AulaService $aulas,
    ) {}

    public function index(Curso $curso): JsonResponse
    {
        $this->authorize('view', $curso);

        return response()->json($curso->aulas()->get());
    }

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->aulas->criar($curso, $dados), 201));
    }

    public function update(Request $request, Aula $aula): JsonResponse
    {
        $this->authorize('update', $aula->curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->aulas->atualizar($aula, $dados)));
    }

    public function destroy(Aula $aula): JsonResponse
    {
        $this->authorize('update', $aula->curso);

        return $this->executar(function () use ($aula): JsonResponse {
            $this->aulas->excluir($aula);

            return response()->json(['deleted' => true]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'titulo' => [$obrigatorio, 'string', 'max:255'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'duracao_minutos' => [$obrigatorio, 'integer', 'min:1', 'max:1440'],
            'ordem' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}

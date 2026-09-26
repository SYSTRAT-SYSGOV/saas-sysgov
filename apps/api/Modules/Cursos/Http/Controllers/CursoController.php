<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Services\CursoService;

final class CursoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CursoService $cursos,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Curso::class);

        $query = Curso::query()->withCount('turmas')->latest('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($tipo = $request->query('tipo')) {
            $query->where('tipo', $tipo);
        }
        if ($busca = $request->query('busca')) {
            $query->where('titulo', 'like', '%' . $busca . '%');
        }

        return response()->json($query->paginate((int) $request->query('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Curso::class);
        $dados = $request->validate($this->regras());

        return $this->executar(fn () => response()->json($this->cursos->criar($dados, $request->user()), 201));
    }

    public function show(Curso $curso): JsonResponse
    {
        $this->authorize('view', $curso);

        return response()->json($curso->load(['aulas', 'turmas' => fn ($q) => $q->orderBy('data_inicio'), 'formacoes']));
    }

    public function update(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate($this->regras(parcial: true));

        return $this->executar(fn () => response()->json($this->cursos->atualizar($curso, $dados)));
    }

    public function destroy(Curso $curso): JsonResponse
    {
        $this->authorize('delete', $curso);

        return $this->executar(function () use ($curso): JsonResponse {
            $this->cursos->excluir($curso);

            return response()->json(['deleted' => true]);
        });
    }

    public function alterarStatus(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $dados = $request->validate(['status' => ['required', Rule::enum(StatusCurso::class)]]);

        return $this->executar(fn () => response()->json($this->cursos->alterarStatus($curso, StatusCurso::from($dados['status']))));
    }

    public function definirCapa(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);
        $request->validate(['capa' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);

        return response()->json($this->cursos->definirCapa($curso, $request->file('capa')));
    }

    public function removerCapa(Curso $curso): JsonResponse
    {
        $this->authorize('update', $curso);

        return response()->json($this->cursos->removerCapa($curso));
    }

    /**
     * @return array<string, mixed>
     */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'tipo' => ['sometimes', Rule::enum(TipoCurso::class)],
            'titulo' => [$obrigatorio, 'string', 'max:255'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'carga_horaria_minutos' => [$obrigatorio, 'integer', 'min:1', 'max:100000'],
            'frequencia_minima' => ['sometimes', 'integer', 'between:0,100'],
            'modelo_certificado_id' => ['sometimes', 'nullable', 'integer', Rule::exists('cursos_modelos_certificado', 'id')->where('tenant_id', app(\App\Support\TenantContext::class)->id())],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Pedagogico\Http\Requests\SalvarOcorrenciaRequest;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Services\EscopoProfessor;
use Modules\Pedagogico\Services\OcorrenciaService;
use Symfony\Component\HttpFoundation\Response;

final class OcorrenciaController extends Controller
{
    public function __construct(
        private readonly OcorrenciaService $ocorrencias,
        private readonly EscopoProfessor $escopo,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ocorrencia::class);

        $pagina = $this->escopo->aplicar(Ocorrencia::query(), $request->user(), 'aluno.turma_id')
            ->with(['categoria:id,nome,cor,deleted_at', 'aluno:id,nome,numero,turma_id', 'autor:id,name'])
            ->when($request->query('aluno_id'), fn ($q, $v) => $q->where('aluno_id', (int) $v))
            ->when($request->query('categoria_id'), fn ($q, $v) => $q->where('categoria_id', (int) $v))
            ->when($request->query('turma_id'), fn ($q, $v) => $q->whereHas('aluno', fn ($a) => $a->where('turma_id', (int) $v)))
            ->orderByDesc('data')->orderByDesc('id')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 25))));

        return response()->json($pagina);
    }

    /** Total de ocorrências por aluno (opcionalmente de uma turma). */
    public function totais(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ocorrencia::class);

        $totais = $this->escopo->aplicar(Ocorrencia::query(), $request->user(), 'aluno.turma_id')
            ->when($request->query('turma_id'), fn ($q, $v) => $q->whereHas('aluno', fn ($a) => $a->where('turma_id', (int) $v)))
            ->selectRaw('aluno_id, COUNT(*) as total')
            ->groupBy('aluno_id')
            ->get()
            ->map(fn ($linha): array => ['aluno_id' => (int) $linha->aluno_id, 'total' => (int) $linha->getAttribute('total')]);

        return response()->json($totais);
    }

    public function store(SalvarOcorrenciaRequest $request): JsonResponse
    {
        /** @var array{aluno_id: int, categoria_id: int, data: string, descricao: string, severidade: string} $dados */
        $dados = collect($request->validated())->except('anexo')->all();

        return response()->json($this->ocorrencias->registrar($dados, $request->file('anexo'), $request->user()), 201);
    }

    public function show(Ocorrencia $ocorrencia): JsonResponse
    {
        $this->authorize('view', $ocorrencia);

        return response()->json($ocorrencia->load(['categoria', 'aluno', 'autor:id,name']));
    }

    public function update(SalvarOcorrenciaRequest $request, Ocorrencia $ocorrencia): JsonResponse
    {
        return response()->json($this->ocorrencias->atualizar($ocorrencia, collect($request->validated())->except('anexo')->all(), $request->file('anexo')));
    }

    public function destroy(Ocorrencia $ocorrencia): JsonResponse
    {
        $this->authorize('delete', $ocorrencia);
        $this->ocorrencias->excluir($ocorrencia);

        return response()->json(['deleted' => true]);
    }

    public function anexo(Ocorrencia $ocorrencia): Response
    {
        $this->authorize('view', $ocorrencia);
        abort_if($ocorrencia->anexo_path === null || !Storage::disk(OcorrenciaService::DISCO)->exists($ocorrencia->anexo_path), 404);

        return Storage::disk(OcorrenciaService::DISCO)->download($ocorrencia->anexo_path, $ocorrencia->anexo_nome);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Escola\Http\Requests\EnviarFotoRequest;
use Modules\Escola\Http\Requests\ExcluirAlunosRequest;
use Modules\Escola\Http\Requests\ImportarAlunosRequest;
use Modules\Escola\Http\Requests\LimparTurmaRequest;
use Modules\Escola\Http\Requests\SalvarAlunoRequest;
use Modules\Escola\Http\Resources\AlunoResource;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Services\AlunoService;
use Modules\Escola\Services\UnidadeService;
use Modules\Escola\Support\LeitorCsv;
use Symfony\Component\HttpFoundation\Response;

final class AlunoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly AlunoService $alunos) {}

    /** Busca por nome, mãe, pai ou turma; filtros por turma e situação; ordem por número e nome. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Aluno::class);
        $busca = trim((string) $request->query('busca', ''));

        $pagina = Aluno::query()
            ->with(['turma.turno', 'turmaOrigem', 'contatos'])
            ->when($request->query('turma_id'), fn ($q, $v) => $q->where('turma_id', (int) $v))
            ->when($request->query('situacao'), fn ($q, $v) => $q->where('situacao', (string) $v))
            ->when($busca !== '', function ($q) use ($busca): void {
                $termo = '%' . $busca . '%';
                // CPF completo (com ou sem máscara) busca pelo hash; o CPF em si é cifrado.
                $cpf = \Modules\Pessoas\Support\Documento::somenteDigitos($busca);
                $q->where(fn ($w) => $w->where('nome', 'like', $termo)
                    ->orWhere('mae', 'like', $termo)
                    ->orWhere('pai', 'like', $termo)
                    ->orWhereHas('turma', fn ($t) => $t->where('nome', 'like', $termo))
                    ->when(strlen($cpf) === 11, fn ($c) => $c->orWhere('cpf_hash', \Modules\Pessoas\Support\Documento::hash($cpf))));
            })
            ->orderByRaw('numero IS NULL')
            ->orderBy('numero')
            ->orderBy('nome')
            ->paginate(min(100, max(1, (int) $request->query('per_page', 20))));

        return response()->json(AlunoResource::collection($pagina)->response()->getData(true));
    }

    public function store(SalvarAlunoRequest $request): JsonResponse
    {
        return response()->json(new AlunoResource($this->alunos->criar($request->validated())), 201);
    }

    public function show(Aluno $aluno): JsonResponse
    {
        $this->authorize('view', $aluno);

        return response()->json(new AlunoResource($aluno->load(['turma.turno', 'turmaOrigem', 'contatos'])));
    }

    public function update(SalvarAlunoRequest $request, Aluno $aluno): JsonResponse
    {
        return response()->json(new AlunoResource($this->alunos->atualizar($aluno, $request->validated())));
    }

    public function destroy(Aluno $aluno): JsonResponse
    {
        $this->authorize('delete', $aluno);
        $this->alunos->excluir($aluno);

        return response()->json(['deleted' => true]);
    }

    public function excluirVarios(ExcluirAlunosRequest $request): JsonResponse
    {
        /** @var list<int> $ids */
        $ids = $request->validated('ids');

        return response()->json(['excluidos' => $this->alunos->excluirVarios($ids)]);
    }

    public function limparTurma(LimparTurmaRequest $request, Turma $turma): JsonResponse
    {
        $this->authorize('view', $turma);

        return $this->executar(fn (): JsonResponse => response()->json([
            'excluidos' => $this->alunos->limparTurma($turma, $request->validated('confirmacao')),
        ]));
    }

    public function importar(ImportarAlunosRequest $request): JsonResponse
    {
        return $this->executar(fn (): JsonResponse => response()->json(
            $this->alunos->importar(LeitorCsv::de($request->file('arquivo')))
        ));
    }

    public function enviarFoto(EnviarFotoRequest $request, Aluno $aluno): JsonResponse
    {
        return response()->json(new AlunoResource($this->alunos->definirFoto($aluno, $request->file('foto'))));
    }

    /** Foto servida só por rota autenticada do próprio tenant (disco privado). */
    public function foto(Aluno $aluno): Response
    {
        $this->authorize('view', $aluno);
        abort_if($aluno->foto_path === null || !Storage::disk(UnidadeService::DISCO)->exists($aluno->foto_path), 404);

        return Storage::disk(UnidadeService::DISCO)->response($aluno->foto_path);
    }
}

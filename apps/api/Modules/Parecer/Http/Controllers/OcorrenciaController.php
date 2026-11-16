<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Parecer\Models\Ocorrencia;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\OcorrenciaService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Ocorrências do aluno ou da turma (ocorrencias.php); categorias do cadastro Escola. */
final class OcorrenciaController extends Controller
{
    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly OcorrenciaService $ocorrencias,
    ) {}

    /** Lista do aluno (aluno_id) ou da turma (turma_id), com o resumo por aluno da turma. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['aluno_id' => ['required_without:turma_id', 'integer'], 'turma_id' => ['required_without:aluno_id', 'integer']]);
        $gestor = $this->acesso->gestor($user);
        $categorias = CategoriaOcorrencia::query()->orderBy('nome')->get(['id', 'nome', 'cor']);

        if ($request->filled('aluno_id')) {
            $aluno = Aluno::query()->with('contatos', 'turma')->findOrFail((int) $request->input('aluno_id'));
            $this->acesso->exigirTurma($user, (int) $aluno->turma_id);
            $lista = Ocorrencia::query()->with('categoria')->where('aluno_id', $aluno->id)->orderByDesc('data')->orderByDesc('id')->get();

            return response()->json([
                'aluno' => ['id' => $aluno->id, 'nome' => $aluno->nome, 'turma_id' => $aluno->turma_id, 'turma' => $aluno->turma?->nome, 'celular' => $aluno->contatos->sortBy('ordem')->first()?->telefone],
                'categorias' => $categorias,
                'ocorrencias' => $lista->map(fn (Ocorrencia $o): array => $this->dados($o, $user, $gestor))->values(),
            ]);
        }

        $turmaId = (int) $request->input('turma_id');
        $this->acesso->exigirTurma($user, $turmaId);
        $alunos = Aluno::query()->with('contatos')->where('turma_id', $turmaId)->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->get();
        $lista = Ocorrencia::query()->with('categoria', 'aluno')->whereIn('aluno_id', $alunos->pluck('id'))->orderByDesc('data')->orderByDesc('id')->get();
        $contagem = $lista->countBy('aluno_id');

        return response()->json([
            'categorias' => $categorias,
            'alunos' => $alunos->map(fn (Aluno $a): array => ['id' => $a->id, 'nome' => $a->nome, 'situacao' => $a->situacao, 'celular' => $a->contatos->sortBy('ordem')->first()?->telefone, 'total' => (int) ($contagem[$a->id] ?? 0)])->values(),
            'ocorrencias' => $lista->take(50)->map(fn (Ocorrencia $o): array => $this->dados($o, $user, $gestor))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $d = $this->validar($request);
        $aluno = Aluno::query()->findOrFail((int) $request->input('aluno_id'));
        $this->acesso->exigirTurma($request->user(), (int) $aluno->turma_id);
        $o = $this->ocorrencias->criar($aluno, $d['data'], $d['categoria_id'] ?? null, $d['descricao'], $request->file('anexo'), $request->user());

        return response()->json($this->dados($o->load('categoria', 'aluno'), $request->user(), true), 201);
    }

    /** POST (multipart, por causa do anexo). */
    public function update(Request $request, Ocorrencia $ocorrencia): JsonResponse
    {
        $this->autorizar($request, $ocorrencia);
        $d = $this->validar($request, false);
        $o = $this->ocorrencias->editar($ocorrencia, $d['data'], $d['categoria_id'] ?? null, $d['descricao'], $request->file('anexo'), $request->boolean('remover_anexo'));

        return response()->json($this->dados($o->load('categoria', 'aluno'), $request->user(), true));
    }

    public function destroy(Request $request, Ocorrencia $ocorrencia): JsonResponse
    {
        $this->autorizar($request, $ocorrencia);
        $this->ocorrencias->excluir($ocorrencia);

        return response()->json(['ok' => true]);
    }

    public function anexo(Request $request, Ocorrencia $ocorrencia): StreamedResponse
    {
        $this->acesso->exigirTurma($request->user(), (int) $ocorrencia->aluno?->turma_id);
        abort_if($ocorrencia->anexo_path === null || !Storage::disk(OcorrenciaService::DISCO)->exists($ocorrencia->anexo_path), 404);

        return Storage::disk(OcorrenciaService::DISCO)->download($ocorrencia->anexo_path, $ocorrencia->anexo_nome ?? 'anexo');
    }

    /** Planilha da turma (data;aluno;categoria;descrição;registrado por;celular). */
    public function planilha(Request $request): Response
    {
        $request->validate(['turma_id' => ['required', 'integer']]);
        $turmaId = (int) $request->input('turma_id');
        $this->acesso->exigirTurma($request->user(), $turmaId);
        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['data', 'aluno', 'categoria', 'descricao', 'registrado_por', 'celular_responsavel'], ';', '"', '');
        $lista = Ocorrencia::query()->with('categoria', 'aluno.contatos')->whereIn('aluno_id', Aluno::query()->where('turma_id', $turmaId)->select('id'))->orderByDesc('data')->get();
        foreach ($lista as $o) {
            fputcsv($out, [$o->data->format('d/m/Y'), $o->aluno?->nome, $o->categoria?->nome, str_replace(["\r", "\n"], ' ', $o->descricao), $o->registrado_nome, $o->aluno?->contatos->sortBy('ordem')->first()?->telefone], ';', '"', '');
        }
        rewind($out);

        return response("\xEF\xBB\xBF" . stream_get_contents($out), 200, ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="ocorrencias-turma-' . $turmaId . '.csv"']);
    }

    private function autorizar(Request $request, Ocorrencia $o): void
    {
        $this->acesso->exigirTurma($request->user(), (int) $o->aluno?->turma_id);
        abort_unless(OcorrenciaService::podeMexer($o, $request->user(), $this->acesso->gestor($request->user())), 403, 'Só quem registrou ou a gestão pode alterar esta ocorrência.');
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, bool $criar = true): array
    {
        return $request->validate([
            'aluno_id' => [$criar ? 'required' : 'sometimes', 'integer'],
            'data' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'categoria_id' => ['nullable', 'integer', Rule::exists('escola_categorias_ocorrencia', 'id')->where('tenant_id', app(\App\Support\TenantContext::class)->id())],
            'descricao' => ['required', 'string', 'max:5000'],
            'anexo' => ['nullable', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf'],
            'remover_anexo' => ['nullable', 'boolean'],
        ], ['descricao.required' => 'Descreva a ocorrência.', 'anexo.*' => 'Envie foto (JPG, PNG, WEBP) ou PDF de até 5 MB.']);
    }

    /** @return array<string, mixed> */
    private function dados(Ocorrencia $o, \App\Models\User $user, bool $gestor): array
    {
        return [
            'id' => $o->id,
            'aluno_id' => $o->aluno_id,
            'aluno' => $o->relationLoaded('aluno') ? $o->aluno?->nome : null,
            'data' => $o->data->format('Y-m-d'),
            'categoria' => $o->categoria ? ['id' => $o->categoria->id, 'nome' => $o->categoria->nome, 'cor' => $o->categoria->cor] : null,
            'descricao' => $o->descricao,
            'registrado_nome' => $o->registrado_nome,
            'anexo_nome' => $o->anexo_nome,
            'pode_mexer' => OcorrenciaService::podeMexer($o, $user, $gestor),
        ];
    }
}

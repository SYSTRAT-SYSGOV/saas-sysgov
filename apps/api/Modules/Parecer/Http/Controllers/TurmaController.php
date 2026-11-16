<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\FuncaoTurma;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\AcessoParecer;
use Modules\Parecer\Services\HabilidadeService;
use Modules\Parecer\Services\TurmaService;
use Modules\Parecer\Support\Catalogo;

/** Início (cards de séries e turmas), alunos da turma com progresso e configuração das turmas. */
final class TurmaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AcessoParecer $acesso,
        private readonly TurmaService $turmas,
        private readonly HabilidadeService $habilidades,
    ) {}

    /** Catálogo (matérias, séries, conceitos, funções) e o que o usuário pode fazer. */
    public function catalogo(Request $request): JsonResponse
    {
        abort_unless($this->acesso->pode($request->user(), 'parecer.view'), 403);

        return response()->json([
            'materias' => Catalogo::MATERIAS,
            'series' => Catalogo::SERIES,
            'conceitos' => Catalogo::CONCEITOS,
            'funcoes' => array_map(fn (array $f): array => ['rotulo' => $f[0], 'materias' => $f[1]], Catalogo::FUNCOES),
            'media_aprovacao' => Catalogo::MEDIA_APROVACAO,
            'aulas_por_dia' => Catalogo::AULAS_POR_DIA,
            'gestor' => $this->acesso->gestor($request->user()),
            'auditoria' => $this->acesso->pode($request->user(), 'parecer.auditoria'),
        ]);
    }

    /** Turmas visíveis do ano, com série, turno, alunos ativos e regente; e habilidades ativas por série. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->acesso->pode($user, 'parecer.view'), 403);
        $ano = (int) $request->integer('ano', (int) date('Y'));
        $this->habilidades->garantirPadrao();
        $visiveis = $this->acesso->turmasDoUsuario($user);

        $configs = TurmaSerie::query()->with('turma.turno')->get()
            ->filter(fn (TurmaSerie $c): bool => $c->turma !== null && $c->turma->ano_letivo === $ano && ($visiveis === null || in_array($c->turma_id, $visiveis, true)));
        $ids = $configs->pluck('turma_id')->all();
        $ativos = Aluno::query()->whereIn('turma_id', $ids)->where('situacao', 'ativo')->selectRaw('turma_id, COUNT(*) n')->groupBy('turma_id')->pluck('n', 'turma_id');
        $regentes = FuncaoTurma::query()->whereIn('turma_id', $ids)->where('funcao', 'professor_regente')->pluck('user_id', 'turma_id');
        $nomes = User::query()->whereIn('id', $regentes->values())->pluck('name', 'id');

        return response()->json([
            'habilidades_por_serie' => Habilidade::query()->where('ativo', true)->selectRaw('serie, COUNT(*) n')->groupBy('serie')->pluck('n', 'serie'),
            'turmas' => $configs->sortBy(fn (TurmaSerie $c): string => $c->serie . '|' . $c->turma->nome)->map(fn (TurmaSerie $c): array => [
                'turma_id' => $c->turma_id,
                'nome' => $c->turma->nome,
                'serie' => $c->serie,
                'turno' => $c->turma->turno?->nome,
                'alunos_ativos' => (int) ($ativos[$c->turma_id] ?? 0),
                'regente' => isset($regentes[$c->turma_id]) ? ($nomes[$regentes[$c->turma_id]] ?? null) : null,
                'materias' => $this->acesso->materiasDoUsuario($user, $c->turma_id),
            ])->values(),
        ]);
    }

    /** Alunos da turma com o progresso da avaliação por trimestre (alunos.php). */
    public function alunos(Request $request, Turma $turma): JsonResponse
    {
        $user = $request->user();
        $this->acesso->exigirTurma($user, $turma->id);
        $serie = (int) TurmaSerie::query()->where('turma_id', $turma->id)->value('serie');
        $habs = Habilidade::query()->where('serie', $serie)->where('ativo', true)->get(['id', 'trimestres']);
        $porTri = [];
        foreach ([1, 2, 3] as $t) {
            $porTri[$t] = $habs->filter(fn (Habilidade $h): bool => str_contains($h->trimestres, (string) $t))->pluck('id')->all();
        }
        $alunos = Aluno::query()->with('contatos')->where('turma_id', $turma->id)->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')->get();
        $feitos = Avaliacao::query()->whereIn('aluno_id', $alunos->pluck('id'))->get(['aluno_id', 'habilidade_id', 'trimestre']);

        return response()->json([
            'turma' => ['id' => $turma->id, 'nome' => $turma->nome, 'serie' => $serie, 'turno' => $turma->turno?->nome, 'ano_letivo' => $turma->ano_letivo],
            'habilidades_por_trimestre' => array_map('count', $porTri),
            'materias' => $this->acesso->materiasDoUsuario($user, $turma->id),
            'alunos' => $alunos->map(fn (Aluno $a): array => [
                'id' => $a->id,
                'numero' => $a->numero,
                'nome' => $a->nome,
                'cgm' => $a->cgm,
                'nascimento' => $a->nascimentoDaPessoa()?->format('Y-m-d'),
                'situacao' => $a->situacao,
                'tem_foto' => $a->foto_path !== null,
                'celular' => $a->contatos->sortBy('ordem')->first()?->telefone,
                'progresso' => array_map(fn (array $ids): int => $feitos->where('aluno_id', $a->id)->whereIn('habilidade_id', $ids)->count(), [1 => $porTri[1], 2 => $porTri[2], 3 => $porTri[3]]),
            ])->values(),
        ]);
    }

    /** Gestor: todas as turmas da escola no ano, com série e funções, e a equipe que pode ser escolhida. */
    public function configuracoes(Request $request, TenantContext $tenant): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $ano = (int) $request->integer('ano', (int) date('Y'));
        $turmas = Turma::query()->with('turno')->where('ano_letivo', $ano)->orderBy('nome')->get();
        $series = TurmaSerie::query()->whereIn('turma_id', $turmas->pluck('id'))->pluck('serie', 'turma_id');
        $funcoes = FuncaoTurma::query()->whereIn('turma_id', $turmas->pluck('id'))->get()->groupBy('turma_id');

        return response()->json([
            'turmas' => $turmas->map(fn (Turma $t): array => [
                'turma_id' => $t->id,
                'nome' => $t->nome,
                'turno' => $t->turno?->nome,
                'serie' => isset($series[$t->id]) ? (int) $series[$t->id] : null,
                'funcoes' => ($funcoes[$t->id] ?? collect())->pluck('user_id', 'funcao'),
            ])->values(),
            'equipe' => $this->equipe($tenant),
        ]);
    }

    public function configurar(Request $request, Turma $turma, TenantContext $tenant): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $dados = $request->validate([
            'serie' => ['required', 'integer', 'between:1,5'],
            'funcoes' => ['array'],
            'funcoes.*' => ['nullable', 'integer'],
        ]);
        $validos = array_map(fn (array $u): int => $u['id'], $this->equipe($tenant));

        return $this->executar(fn (): JsonResponse => response()->json(
            $this->turmas->configurar($turma, (int) $dados['serie'], array_intersect_key($dados['funcoes'] ?? [], Catalogo::FUNCOES), $validos)
        ));
    }

    public function remover(Request $request, Turma $turma): JsonResponse
    {
        $this->acesso->exigirGestor($request->user());
        $this->turmas->remover($turma);

        return response()->json(['ok' => true]);
    }

    /**
     * Usuários ativos do tenant (nome do Cadastro de Pessoas quando houver), como o ProfessorController do Escola.
     *
     * @return list<array{id: int, nome: string}>
     */
    private function equipe(TenantContext $tenant): array
    {
        return User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id())->where('tenant_user.status', 'active'))
            ->leftJoin('pessoas_usuarios', fn ($j) => $j->on('pessoas_usuarios.user_id', '=', 'users.id')->where('pessoas_usuarios.tenant_id', $tenant->id()))
            ->leftJoin('pessoas', fn ($j) => $j->on('pessoas.id', '=', 'pessoas_usuarios.pessoa_id')->whereNull('pessoas.deleted_at'))
            ->orderBy(DB::raw('COALESCE(pessoas.nome, users.name)'))
            ->get(['users.id', 'users.name', 'pessoas.nome as nome_pessoa'])
            ->map(fn (User $u): array => ['id' => (int) $u->id, 'nome' => (string) ($u->getAttribute('nome_pessoa') ?? $u->name)])
            ->values()->all();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Multiprofissional\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Multiprofissional\Models\Atendimento;
use Modules\Multiprofissional\Models\Cargo;
use Modules\Multiprofissional\Models\Condicao;
use Modules\Multiprofissional\Models\Equipe;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Multiprofissional\Models\TipoAtendimento;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;
use Modules\Multiprofissional\Services\CadastroService;
use Modules\Multiprofissional\Support\Formata;
use Symfony\Component\HttpFoundation\Response;

/** Opções dos formulários, cadastros simples (cargos, condições, tipos) e buscas de estudantes e usuários. */
final class CadastroController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CadastroService $cadastros,
        private readonly MultiprofissionalPolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function opcoes(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->ver($user), 403);
        $clinico = $this->policy->acompanhar($user);
        $ref = fn ($q) => $q->where('ativo', true)->orderBy('nome')->get(['id', 'nome'])->map(fn ($m): array => ['id' => $m->id, 'nome' => $m->nome])->values();

        return response()->json([
            'escolas' => Formata::escolas(Escola::query()->where('ativa', true)->orderBy('nome')->get()),
            'equipes' => $ref(Equipe::query()),
            'profissionais' => $ref(Profissional::query()),
            'tipos_atendimento' => $ref(TipoAtendimento::query()),
            'cargos' => $ref(Cargo::query()),
            'condicoes' => $clinico
                ? Condicao::query()->where('ativo', true)->orderBy('nome')->get(['id', 'nome', 'cid'])->map(fn (Condicao $c): array => ['id' => $c->id, 'nome' => $c->nome, 'cid' => $c->cid])->values()
                : [],
            'turnos' => collect(Atendimento::TURNOS)->map(fn (string $r, string $v): array => ['valor' => $v, 'rotulo' => $r])->values(),
            'meu_profissional_id' => $this->policy->profissionalDoUsuario($user)?->id,
            'permissoes' => [
                'atender' => $this->policy->atender($user),
                'acompanhar' => $clinico,
                'gerenciar' => $this->policy->gerenciar($user),
                'auditar' => $this->policy->auditar($user),
            ],
        ]);
    }

    public function listar(Request $request, string $tipo): JsonResponse
    {
        $this->exigir($request, $tipo);
        $classe = $this->cadastros->classe($tipo);

        return response()->json(['data' => $classe::query()->orderBy('nome')->get()->map(fn ($m): array => $m->only(['id', 'nome', 'objetivos', 'cid', 'ativo']))->values()]);
    }

    public function salvar(Request $request, string $tipo, ?int $id = null): Response
    {
        $this->exigir($request, $tipo, escrita: true);
        $classe = $this->cadastros->classe($tipo);
        $item = $id === null ? null : $classe::query()->findOrFail($id);
        $regras = ['nome' => ['required', 'string', 'max:150'], 'ativo' => ['sometimes', 'boolean']];
        if ($tipo === 'cargos') {
            $regras['objetivos'] = ['nullable', 'string', 'max:300'];
        }
        if ($tipo === 'condicoes') {
            $regras['nome'] = ['required', 'string', 'max:200'];
            $regras['cid'] = ['nullable', 'string', 'max:20'];
        }
        $dados = $request->validate($regras);

        return $this->executar(fn () => response()->json(['data' => $this->cadastros->salvar($tipo, $item, $dados)->only(['id', 'nome', 'objetivos', 'cid', 'ativo'])], $item === null ? 201 : 200));
    }

    public function excluir(Request $request, string $tipo, int $id): JsonResponse
    {
        $this->exigir($request, $tipo, escrita: true);
        $item = $this->cadastros->classe($tipo)::query()->findOrFail($id);

        return response()->json(['excluido' => $this->cadastros->excluir($tipo, $item)]);
    }

    public function padroes(Request $request): JsonResponse
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);

        return response()->json(['data' => $this->cadastros->carregarPadroes()]);
    }

    /** Busca de estudantes (módulo Escola) em todas as escolas do tenant, por nome ou CGM. */
    public function alunos(Request $request): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q']);

        $alunos = Aluno::query()->withoutGlobalScope('escola')->with('turma')
            ->where(fn ($w) => $w->where('nome', 'like', '%' . mb_strtoupper($q, 'UTF-8') . '%')->orWhere('cgm', $q))
            ->orderBy('nome')->limit(20)->get();

        return response()->json(['data' => $alunos->map(fn (Aluno $a): ?array => $this->formata->aluno($a))->values()]);
    }

    /** Usuários do tenant para ligar ao profissional (D3): só id, nome e e-mail. */
    public function usuarios(Request $request): JsonResponse
    {
        abort_unless($this->policy->gerenciar($request->user()), 403);
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q']);

        $usuarios = User::query()
            ->whereIn('id', DB::table('tenant_user')->where('tenant_id', app(TenantContext::class)->id())->select('user_id'))
            ->where(fn ($w) => $w->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"))
            ->orderBy('name')->limit(20)->get(['id', 'name', 'email']);

        return response()->json(['data' => $usuarios->map(fn (User $u): array => ['id' => $u->id, 'nome' => $u->name, 'email' => $u->email])->values()]);
    }

    /** Leitura de cargos/tipos: quem vê o módulo; condições (CID): só quem acompanha. Escrita: só gestão. */
    private function exigir(Request $request, string $tipo, bool $escrita = false): void
    {
        $this->cadastros->classe($tipo);
        $user = $request->user();
        $pode = match (true) {
            $escrita => $this->policy->gerenciar($user),
            $tipo === 'condicoes' => $this->policy->acompanhar($user),
            default => $this->policy->ver($user),
        };
        abort_unless($pode, 403);
    }
}

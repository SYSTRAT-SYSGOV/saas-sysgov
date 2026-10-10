<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Http\Middleware\ResolveCampanha;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Candidato;
use Modules\Campanha\Models\Membro;
use Modules\Campanha\Services\CampanhaService;

/** Campanhas do tenant, candidato e membros — rotas sem campanha de trabalho (D2). */
final class CampanhaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CampanhaService $campanhas,
        private readonly TenantContext $tenant,
    ) {}

    /** Campanhas que o usuário acessa (todas, para a gestão), com o candidato. */
    public function minhas(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Campanha::class);
        /** @var User $user */
        $user = $request->user();

        $lista = Campanha::query()->with('candidato.pessoa')->orderByDesc('ano')->orderBy('nome')->get()
            ->filter(fn (Campanha $c): bool => ResolveCampanha::podeAcessar($user, $c, $this->tenant->id()))
            ->values();

        return response()->json(['campanhas' => $lista]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Campanha::class);

        return $this->executar(fn () => response()->json($this->campanhas->criar($request->validate($this->regras())), 201));
    }

    public function show(Campanha $campanha): JsonResponse
    {
        $this->authorize('view', $campanha);

        $campanha->load('candidato.pessoa');

        return response()->json([
            ...$campanha->toArray(),
            'lgpd_termo_vigente' => $campanha->termoLgpd(),
            'anonimizacao_prevista' => $campanha->anonimizacaoPrevista()?->toDateString(),
        ]);
    }

    public function update(Request $request, Campanha $campanha): JsonResponse
    {
        $this->authorize('update', $campanha);

        return $this->executar(fn () => response()->json($this->campanhas->atualizar($campanha, $request->validate($this->regras(parcial: true)))));
    }

    public function destroy(Campanha $campanha): JsonResponse
    {
        $this->authorize('delete', $campanha);
        $this->campanhas->excluir($campanha);

        return response()->json(['deleted' => true]);
    }

    public function salvarCandidato(Request $request, Campanha $campanha): JsonResponse
    {
        $this->authorize('update', $campanha);
        $dados = $request->validate([
            'cpf' => ['sometimes', 'nullable', 'string', 'max:14'],
            'nome_completo' => ['sometimes', 'nullable', 'string', 'max:255'],
            'nome_urna' => [Candidato::query()->withoutGlobalScope('campanha')->where('campanha_id', $campanha->id)->exists() ? 'sometimes' : 'required', 'string', 'max:200'],
            'partido' => ['sometimes', 'nullable', 'string', 'max:50'],
            'numero' => ['sometimes', 'nullable', 'string', 'max:15'],
            'coligacao' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telefone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'max:20'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'instagram' => ['sometimes', 'nullable', 'string', 'max:100'],
            'facebook' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tiktok' => ['sometimes', 'nullable', 'string', 'max:100'],
            'youtube' => ['sometimes', 'nullable', 'string', 'max:100'],
            'site' => ['sometimes', 'nullable', 'string', 'max:255'],
            'biografia' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'votos_ultima_eleicao' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'cargo_ultima_eleicao' => ['sometimes', 'nullable', 'string', 'max:100'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        return $this->executar(fn () => response()->json($this->campanhas->salvarCandidato($campanha, $dados)));
    }

    public function membros(Campanha $campanha): JsonResponse
    {
        $this->authorize('view', $campanha);

        return response()->json([
            'membros' => Membro::query()->where('campanha_id', $campanha->id)->with('user:id,name,email')->get()
                ->map(fn (Membro $m): array => ['user_id' => $m->user_id, 'nome' => $m->user->name, 'email' => $m->user->email])->values(),
        ]);
    }

    /** Usuários do tenant que podem ser incluídos como membros (só para a gestão da campanha). */
    public function usuarios(Campanha $campanha): JsonResponse
    {
        $this->authorize('update', $campanha);

        return response()->json(['usuarios' => User::query()->ofTenant($this->tenant->id())->orderBy('name')->get(['users.id', 'users.name', 'users.email'])
            ->map(fn (User $u): array => ['id' => $u->id, 'nome' => $u->name, 'email' => $u->email])->values()]);
    }

    public function definirMembros(Request $request, Campanha $campanha): JsonResponse
    {
        $this->authorize('update', $campanha);
        $dados = $request->validate(['user_ids' => ['present', 'array'], 'user_ids.*' => ['integer']]);

        return $this->executar(function () use ($campanha, $dados): JsonResponse {
            $this->campanhas->definirMembros($campanha, $dados['user_ids']);

            return $this->membros($campanha);
        });
    }

    /** @return array<string, mixed> */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'nome' => [$obrigatorio, 'string', 'max:200'],
            'ano' => [$obrigatorio, 'integer', 'between:2000,2100'],
            'cargo' => [$obrigatorio, 'string', 'max:100'],
            'uf' => [$obrigatorio, 'string', Rule::in(CampanhaService::UFS)],
            'meta_votos_global' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', Rule::in(['ativa', 'encerrada'])],
            'lgpd_termo' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'lgpd_encarregado_nome' => ['sometimes', 'nullable', 'string', 'max:200'],
            'lgpd_encarregado_contato' => ['sometimes', 'nullable', 'string', 'max:200'],
            'lgpd_retencao_dias' => ['sometimes', 'integer', 'between:1,3650'],
        ];
    }
}

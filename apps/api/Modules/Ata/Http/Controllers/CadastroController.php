<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Ata\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaTipo;
use Modules\Ata\Policies\AtaPolicy;
use Modules\Ata\Services\ArquivoAtaService;
use Modules\Ata\Services\AtaIaService;
use Modules\Ata\Services\SecretariaAtaService;
use Modules\Ata\Services\TipoAtaService;
use Modules\Pessoas\Models\Pessoa;
use Symfony\Component\HttpFoundation\Response;

/** Opções dos formulários, tipos de ata, configuração das secretarias e busca de participantes. */
final class CadastroController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly TipoAtaService $tipos,
        private readonly SecretariaAtaService $secretarias,
        private readonly ArquivoAtaService $arquivos,
        private readonly AtaPolicy $policy,
        private readonly AtaIaService $ia,
    ) {}

    public function opcoes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ata::class);
        $user = $request->user();
        $gerencia = $this->policy->gerencia($user);

        return response()->json([
            'tipos' => $this->tipos->listar(true)->map(fn (AtaTipo $t): array => ['id' => $t->id, 'nome' => $t->nome])->values(),
            'secretarias' => $this->secretarias->listar($gerencia ? null : $this->secretarias->secretariasDoUsuario($user)),
            'ia_disponivel' => $this->ia->disponivel(),
            'modos_ia' => collect(AtaIaService::MODOS)->map(fn (string $r, int $v): array => ['valor' => $v, 'rotulo' => $r])->values(),
            'permissoes' => [
                'criar' => $this->policy->create($user),
                'gerenciar' => $gerencia,
                'auditar' => $this->policy->auditar($user),
            ],
            'redator_sugerido' => $user->name,
        ]);
    }

    public function tipos(Request $request): JsonResponse
    {
        $this->exigirGestao($request);

        return response()->json(['data' => $this->tipos->listar()->map(fn (AtaTipo $t): array => $t->only(['id', 'nome', 'ativo']))->values()]);
    }

    public function salvarTipo(Request $request, ?AtaTipo $tipo = null): Response
    {
        $this->exigirGestao($request);
        $dados = $request->validate(['nome' => ['required', 'string', 'max:150'], 'ativo' => ['sometimes', 'boolean']]);

        return $this->executar(fn () => response()->json($this->tipos->salvar($tipo, $dados['nome'], (bool) ($dados['ativo'] ?? true))->only(['id', 'nome', 'ativo']), $tipo === null ? 201 : 200));
    }

    public function excluirTipo(Request $request, AtaTipo $tipo): Response
    {
        $this->exigirGestao($request);
        $this->tipos->excluir($tipo);

        return response()->json(null, 204);
    }

    public function secretarias(Request $request): JsonResponse
    {
        $this->exigirGestao($request);

        return response()->json(['data' => $this->secretarias->listar()]);
    }

    public function salvarSecretaria(Request $request, int $orgUnit): Response
    {
        $this->exigirGestao($request);
        $dados = $request->validate([
            'sigla' => ['nullable', 'string', 'max:30'],
            'timbrado' => ['nullable', ...array_slice(ArquivoAtaService::REGRA_TIMBRADO, 1)],
            'remover_timbrado' => ['sometimes', 'boolean'],
        ]);

        return $this->executar(function () use ($request, $orgUnit, $dados) {
            $this->secretarias->salvar($orgUnit, $dados['sigla'] ?? null, $request->file('timbrado'), (bool) ($dados['remover_timbrado'] ?? false));

            return response()->json(['data' => $this->secretarias->listar([$orgUnit])[0] ?? null]);
        });
    }

    public function timbrado(Request $request, int $orgUnit): Response
    {
        $this->exigirGestao($request);
        $config = $this->secretarias->config($orgUnit);
        abort_if($config?->timbrado_path === null, 404);

        return $this->arquivos->resposta((string) $config->timbrado_path, (string) $config->timbrado_mime, 'timbrado') ?? abort(404);
    }

    /** Busca mínima no Cadastro de Pessoas para escolher participantes: só id e nome (LGPD). */
    public function pessoas(Request $request): JsonResponse
    {
        abort_unless($this->policy->create($request->user()), 403);
        $q = trim((string) $request->validate(['q' => ['required', 'string', 'min:3', 'max:100']])['q']);

        $pessoas = Pessoa::query()
            ->where(fn ($w) => $w->where('nome', 'like', "%{$q}%")->orWhere('nome_social', 'like', "%{$q}%"))
            ->orderBy('nome')->limit(20)->get(['id', 'nome', 'nome_social']);

        return response()->json(['data' => $pessoas->map(fn (Pessoa $p): array => ['id' => $p->id, 'nome' => $p->nome_social ?: $p->nome])->values()]);
    }

    private function exigirGestao(Request $request): void
    {
        abort_unless($this->policy->gerencia($request->user()), 403);
    }
}

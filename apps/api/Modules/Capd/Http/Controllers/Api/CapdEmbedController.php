<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers\Api;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\EmbedTokenService;

final class CapdEmbedController extends Controller
{
    public function __construct(
        private readonly EmbedTokenService $embedService,
    ) {}

    /**
     * POST /api/v1/capd/embed/token
     * Solicitação de token seguro pelo RH terceiro (via API Key) ou usuário autenticado.
     */
    public function generateToken(Request $request): JsonResponse
    {
        $request->validate([
            'identificador' => ['required', 'string'], // CPF ou matrícula
            'mode'          => ['nullable', 'string', 'in:autoavaliacao,diario-bordo,espelho,recurso'],
            'ttl_minutes'   => ['nullable', 'integer', 'min:5', 'max:1440'],
        ]);

        $apiKey = (string) ($request->header('X-RH-API-Key') ?? '');
        $tenantId = null;

        if (!empty($apiKey)) {
            $integracao = RhIntegracao::where('api_key', $apiKey)->where('is_active', true)->first();
            if (!$integracao) {
                abort(403, 'Chave de integração inválida.');
            }
            $tenantId = $integracao->tenant_id;
        } else {
            $tenantId = (int) app(TenantContext::class)->id();
        }

        if (!$tenantId) {
            abort(401, 'Contexto de município não identificado.');
        }

        $token = $this->embedService->generateToken(
            $tenantId,
            (string) $request->input('identificador'),
            (string) ($request->input('mode') ?? 'autoavaliacao'),
            (int) ($request->input('ttl_minutes') ?? 60)
        );

        return response()->json([
            'embed_token' => $token,
            'expires_in'  => (int) ($request->input('ttl_minutes') ?? 60) * 60,
            'embed_url'   => url("/capd/embed?token={$token}"),
        ]);
    }

    /**
     * GET /api/v1/capd/embed/context
     * Valida o token e retorna o contexto inicial para o widget / iframe embutido.
     */
    public function getEmbedContext(Request $request): JsonResponse
    {
        $token = (string) ($request->query('token') ?? $request->header('X-Embed-Token') ?? '');
        if (empty($token)) {
            return response()->json(['error' => 'Token de embutimento ausente.'], 401);
        }

        $session = $this->embedService->validateToken($token);
        if (!$session) {
            return response()->json(['error' => 'Token inválido ou expirado.'], 403);
        }

        $tenantId = $session['tenant_id'];

        $cicloAtivo = CicloAvaliacao::where('tenant_id', $tenantId)
            ->whereIn('status', ['planejamento', 'em_avaliacao', 'recursivo'])
            ->latest('ano_referencia')
            ->first();

        $fatores = FatorAvaliacao::where('tenant_id', $tenantId)
            ->where('ativo', true)
            ->orderBy('ordem')
            ->get();

        $servidor = null;
        if ($session['servidor_id']) {
            $servidor = Servidor::where('tenant_id', $tenantId)->find($session['servidor_id']);
        }

        return response()->json([
            'session'  => $session,
            'servidor' => $servidor ? [
                'id'            => $servidor->id,
                'nome'          => $servidor->nome_completo,
                'matricula'     => $servidor->matricula,
                'cargo'         => $servidor->cargo_efetivo,
                'lotacao'       => $servidor->orgao_lotacao,
                'estagio'       => $servidor->estagio_probatorio,
            ] : null,
            'ciclo'    => $cicloAtivo ? [
                'id'             => $cicloAtivo->id,
                'nome'           => $cicloAtivo->nome,
                'ano_referencia' => $cicloAtivo->ano_referencia,
                'status'         => $cicloAtivo->status,
                'data_limite'    => $cicloAtivo->data_fim_avaliacao->toDateString(),
            ] : null,
            'fatores'  => $fatores->map(fn ($f) => [
                'id'        => $f->id,
                'codigo'    => $f->codigo,
                'nome'      => $f->nome,
                'descricao' => $f->descricao,
                'peso'      => $f->peso_geral,
            ]),
        ]);
    }
}

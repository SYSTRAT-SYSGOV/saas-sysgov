<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\VistoriaIntegracao;
use Modules\Vistoria\Services\IntegracaoVistoriaService;

/**
 * Endpoint público de integração M2M (seção 14.3) — autos de infração do tenant dono da
 * credencial de API apresentada, sem exigir login humano. Nunca expõe `dados_autuado`
 * (contém o CPF do autuado, criptografado em repouso — seção 14.1): expor o valor
 * decriptado aqui anularia a proteção LGPD que aquela tarefa acabou de implementar.
 */
final class AutuacoesPublicasController extends Controller
{
    public function __construct(
        private readonly IntegracaoVistoriaService $integracoes,
        private readonly TenantContext $tenantContext,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $integracao = $this->resolverIntegracao($request);
        $this->tenantContext->set($integracao->tenant);
        $this->integracoes->registrarUso($integracao);

        $paginador = Documento::query()
            ->where('tipo', Documento::TIPO_AUTO_INFRACAO)
            ->with('execucao.ordemServico.local')
            ->orderByDesc('created_at')
            ->paginate((int) $request->input('per_page', 20));

        $itens = $paginador->getCollection()->map(fn (Documento $documento): array => [
            'id' => $documento->id,
            'numero' => $documento->numero,
            'exercicio' => $documento->exercicio,
            'irregularidade' => $documento->irregularidade,
            'enquadramento_legal' => $documento->enquadramento_legal,
            'prazo_limite' => $documento->prazo_limite,
            'local_nome' => $documento->execucao?->ordemServico?->local?->nome,
            'emitido_em' => $documento->getAttribute('created_at'),
        ])->all();

        return response()->json([
            'data' => $itens,
            'current_page' => $paginador->currentPage(),
            'last_page' => $paginador->lastPage(),
            'per_page' => $paginador->perPage(),
            'total' => $paginador->total(),
        ]);
    }

    /** @throws \Symfony\Component\HttpKernel\Exception\HttpException 401 quando a credencial está ausente ou é inválida/inativa */
    private function resolverIntegracao(Request $request): VistoriaIntegracao
    {
        $apiKey = $request->bearerToken() ?? $request->header('X-Vistoria-API-Key');

        if (empty($apiKey)) {
            abort(401, 'Credencial de API ausente.');
        }

        $integracao = VistoriaIntegracao::where('api_key', $apiKey)->where('is_active', true)->first();

        if (! $integracao) {
            abort(401, 'Credencial de API inválida ou inativa.');
        }

        return $integracao;
    }
}

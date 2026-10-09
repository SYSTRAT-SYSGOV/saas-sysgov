<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;
use Modules\MeioAmbiente\Support\RepresentacaoIntegracao;

/**
 * API pública M2M para órgãos de controle — sem login humano: a credencial apresentada
 * (`Authorization: Bearer` ou `X-MeioAmbiente-API-Key`) define o tenant, e todas as
 * consultas passam a valer só para ele (escopo do `TenantAware`). Mesmo padrão de
 * `Vistoria\AutuacoesPublicasController`, inclusive 401 tanto para credencial
 * ausente quanto inválida/inativa.
 */
final class IntegracaoPublicaController extends Controller
{
    private const POR_PAGINA_MAXIMO = 100;

    public function __construct(
        private readonly IntegracaoMeioAmbienteService $integracoes,
        private readonly TenantContext $tenantContext,
    ) {}

    public function licencas(Request $request): JsonResponse
    {
        $this->autenticar($request);
        $filtros = $request->validate(['exercicio' => ['nullable', 'integer'], 'per_page' => ['nullable', 'integer', 'min:1']]);

        $paginador = ProcessoLicenciamento::query()
            ->where('status', ProcessoLicenciamento::STATUS_DEFERIDO)
            ->when(isset($filtros['exercicio']), fn ($q) => $q->where('exercicio', $filtros['exercicio']))
            ->with('empreendimento')
            ->orderByDesc('data_deferimento')
            ->paginate($this->porPagina($filtros));

        return $this->paginado($paginador, fn (ProcessoLicenciamento $p): array => RepresentacaoIntegracao::licenca($p));
    }

    public function autosInfracao(Request $request): JsonResponse
    {
        $this->autenticar($request);
        $filtros = $request->validate(['per_page' => ['nullable', 'integer', 'min:1']]);

        $paginador = AutoInfracaoAmbiental::query()
            ->with(['documento.processoSancionatorio', 'empreendimento'])
            ->orderByDesc('id')
            ->paginate($this->porPagina($filtros));

        return $this->paginado($paginador, fn (AutoInfracaoAmbiental $a): array => RepresentacaoIntegracao::autoInfracao($a));
    }

    /** Relatórios Anuais de Resíduos Sólidos já gerados pela chefia (Fase 10). */
    public function relatoriosResiduos(Request $request): JsonResponse
    {
        $this->autenticar($request);
        $filtros = $request->validate(['exercicio' => ['nullable', 'integer'], 'per_page' => ['nullable', 'integer', 'min:1']]);

        $paginador = RelatorioAmbiental::query()
            ->where('tipo', RelatorioAmbiental::TIPO_RARS)
            ->when(isset($filtros['exercicio']), fn ($q) => $q->where('exercicio', $filtros['exercicio']))
            ->orderByDesc('id')
            ->paginate($this->porPagina($filtros));

        return $this->paginado($paginador, fn (RelatorioAmbiental $r): array => [
            'id' => $r->id,
            'exercicio' => $r->exercicio,
            'gerado_em' => $r->created_at->toIso8601String(),
            'dados' => $r->dados,
        ]);
    }

    /** @throws \Symfony\Component\HttpKernel\Exception\HttpException 401 quando a credencial está ausente ou é inválida/inativa */
    private function autenticar(Request $request): void
    {
        $apiKey = $request->bearerToken() ?? $request->header('X-MeioAmbiente-API-Key');
        if (empty($apiKey)) {
            abort(401, 'Credencial de API ausente.');
        }

        $integracao = $this->integracoes->resolverPorChave((string) $apiKey);
        if ($integracao === null) {
            abort(401, 'Credencial de API inválida ou inativa.');
        }

        $this->tenantContext->set($integracao->tenant);
        $this->integracoes->registrarUso($integracao);
    }

    /** @param array{per_page?: int} $filtros */
    private function porPagina(array $filtros): int
    {
        return min((int) ($filtros['per_page'] ?? 20), self::POR_PAGINA_MAXIMO);
    }

    /**
     * @template TModel
     *
     * @param LengthAwarePaginator<int, TModel> $paginador
     * @param callable(TModel): array<string, mixed> $representar
     */
    private function paginado(LengthAwarePaginator $paginador, callable $representar): JsonResponse
    {
        return response()->json([
            'data' => array_map($representar, $paginador->items()),
            'current_page' => $paginador->currentPage(),
            'last_page' => $paginador->lastPage(),
            'per_page' => $paginador->perPage(),
            'total' => $paginador->total(),
        ]);
    }
}

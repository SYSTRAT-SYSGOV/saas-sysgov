<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Modules\Cursos\Services\Publico\OrgaoPublicoService;

/**
 * Casca da página pública do órgão — nome e identidade visual, base pra qualquer página
 * pública do módulo (design D7). O `TenantContext` já vem resolvido pelo `ResolvePublicTenant`.
 */
final class OrgaoController extends Controller
{
    public function __construct(private readonly OrgaoPublicoService $servico) {}

    public function __invoke(TenantContext $tenantContext): JsonResponse
    {
        return response()->json($this->servico->informacoes($tenantContext->get()));
    }
}

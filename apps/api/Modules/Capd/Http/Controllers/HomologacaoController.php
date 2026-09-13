<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Services\HomologacaoLoteService;

/**
 * Homologação Final em Lote de Ciclos da CAPD (RN-C07, RN-C08, RN-C09).
 */
final class HomologacaoController extends Controller
{
    public function __construct(
        private readonly HomologacaoLoteService $homologacao,
    ) {}

    public function homologarCiclo(Request $request, int $cicloId): JsonResponse
    {
        $ciclo = CicloAvaliacao::findOrFail($cicloId);

        // Apenas gestores ou membros autorizados podem homologar o ciclo
        if (! $request->user()->hasRole(['admin_tenant', 'gestor_rh']) && ! $request->user()->hasPermissionTo('capd.avaliacoes.homologar')) {
            abort(403, 'Apenas membros autorizados da comissão CAPD ou Gestores de RH podem homologar o ciclo.');
        }

        try {
            $resultado = $this->homologacao->homologarCiclo($ciclo, $request->user()->id);
        } catch (\DomainException $e) {
            return response()->json([
                'error'   => 'bloqueio_homologacao',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message'   => 'Ciclo de avaliação homologado em lote com sucesso. Evento Outbox disparado.',
            'resultado' => $resultado,
            'ciclo'     => $ciclo->fresh(),
        ]);
    }
}

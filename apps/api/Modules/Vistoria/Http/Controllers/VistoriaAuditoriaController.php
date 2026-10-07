<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Services\AuditoriaVistoriaService;

final class VistoriaAuditoriaController extends Controller
{
    public function __construct(
        private readonly AuditoriaVistoriaService $service,
    ) {}

    public function show(int $id): JsonResponse
    {
        $execucao = ExecucaoVistoria::with(['ordemServico', 'fiscal'])->findOrFail($id);
        $this->authorize('auditoria', $execucao);

        return response()->json([
            'vistoria' => [
                'id' => $execucao->id,
                'ordem_servico_id' => $execucao->ordem_servico_id,
                'fiscal_id' => $execucao->fiscal_id,
                'status' => $execucao->status,
                'sincronizado_em' => $execucao->sincronizado_em,
            ],
            'auditoria' => $this->service->obterTrilha($execucao),
        ]);
    }
}

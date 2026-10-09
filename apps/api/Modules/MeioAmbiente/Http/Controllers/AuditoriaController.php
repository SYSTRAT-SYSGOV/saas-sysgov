<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Services\AuditoriaMeioAmbienteService;

final class AuditoriaController extends Controller
{
    public function __construct(
        private readonly AuditoriaMeioAmbienteService $auditoria,
    ) {}

    public function processoLicenciamento(ProcessoLicenciamento $processoLicenciamento): JsonResponse
    {
        $this->authorize('auditoria', $processoLicenciamento);

        return response()->json([
            'referencia' => [
                'tipo' => 'processo_licenciamento',
                'id' => $processoLicenciamento->id,
                'numero' => $processoLicenciamento->numero,
                'status' => $processoLicenciamento->status,
            ],
            'auditoria' => $this->auditoria->trilhaDoProcessoLicenciamento($processoLicenciamento),
        ]);
    }

    public function autoInfracao(AutoInfracaoAmbiental $autoInfracaoAmbiental): JsonResponse
    {
        $this->authorize('auditoria', $autoInfracaoAmbiental);

        return response()->json([
            'referencia' => [
                'tipo' => 'auto_infracao',
                'id' => $autoInfracaoAmbiental->id,
                'numero' => $autoInfracaoAmbiental->documento->numero,
                'tipo_infracao' => $autoInfracaoAmbiental->tipo_infracao,
            ],
            'auditoria' => $this->auditoria->trilhaDoAutoInfracao($autoInfracaoAmbiental),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\EnrollmentApplicationAnalisarRequest;
use Modules\Educa\Http\Requests\EnrollmentApplicationCreateRequest;
use Modules\Educa\Models\EducaEnrollmentApplication;
use Modules\Educa\Services\EnrollmentApplicationService;
use Modules\Educa\Services\WaitlistRankingService;

final class EnrollmentApplicationController extends Controller
{
    public function __construct(
        private readonly EnrollmentApplicationService $applicationService,
        private readonly WaitlistRankingService $waitlistService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaEnrollmentApplication::class);

        $filtros = [
            'status' => $request->input('status'),
            'etapa_ensino' => $request->input('etapa_ensino'),
            'school_id' => $request->input('school_id'),
            'candidato_pessoa_id' => $request->input('candidato_pessoa_id'),
        ];

        $inscricoes = $this->applicationService->listar($filtros);

        return response()->json([
            'data' => $inscricoes,
        ]);
    }

    public function store(EnrollmentApplicationCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEnrollmentApplication::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();

        $application = $this->applicationService->criar($dados, $tenantId);

        return response()->json([
            'data' => $application,
            'message' => "Inscrição de pré-matrícula registrada com sucesso sob protocolo {$application->numero_protocolo}.",
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $application = $this->applicationService->obter($id);
        $this->authorize('view', $application);

        return response()->json([
            'data' => $application,
        ]);
    }

    public function analisar(EnrollmentApplicationAnalisarRequest $request, string $id): JsonResponse
    {
        $this->authorize('analisar', EducaEnrollmentApplication::class);

        $userId = (int) $request->user()->id;
        $dados = $request->validated();

        $application = $this->applicationService->analisar($id, $dados, $userId);

        // Se deferida, adiciona ou atualiza na fila de espera das escolas de preferência
        if ($application->status === 'deferida') {
            $this->waitlistService->enfileirar($application);
        }

        return response()->json([
            'data' => $application,
            'message' => "Inscrição {$application->numero_protocolo} analisada e marcada como '{$application->status}'.",
        ]);
    }
}

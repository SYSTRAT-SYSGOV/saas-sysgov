<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Educa\Http\Requests\WaitlistConvocarRequest;
use Modules\Educa\Http\Requests\WaitlistConverterMatriculaRequest;
use Modules\Educa\Models\EducaWaitlist;
use Modules\Educa\Services\ApplicationEnrollmentConverterService;
use Modules\Educa\Services\WaitlistRankingService;

final class WaitlistController extends Controller
{
    public function __construct(
        private readonly WaitlistRankingService $rankingService,
        private readonly ApplicationEnrollmentConverterService $converterService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaWaitlist::class);

        $request->validate([
            'school_id' => ['required', 'string'],
            'etapa_ensino' => ['required', 'string'],
            'status' => ['nullable', 'string'],
        ]);

        $fila = $this->rankingService->listarFila([
            'school_id' => $request->input('school_id'),
            'etapa_ensino' => $request->input('etapa_ensino'),
            'status' => $request->input('status'),
        ]);

        return response()->json([
            'data' => $fila,
        ]);
    }

    public function reclassificar(Request $request): JsonResponse
    {
        $this->authorize('manage', EducaWaitlist::class);

        $request->validate([
            'school_id' => ['required', 'string'],
            'etapa_ensino' => ['required', 'string'],
        ]);

        $this->rankingService->reclassificarFila(
            $request->input('school_id'),
            $request->input('etapa_ensino')
        );

        return response()->json([
            'message' => 'Fila de espera reclassificada com sucesso.',
        ]);
    }

    public function convocar(WaitlistConvocarRequest $request, string $id): JsonResponse
    {
        $this->authorize('convocar', EducaWaitlist::class);

        $diasSla = (int) ($request->input('dias_sla', 5));
        $observacoes = $request->input('observacoes');

        $waitlist = $this->converterService->convocarCandidato($id, $diasSla, $observacoes);

        return response()->json([
            'data' => $waitlist,
            'message' => "Candidato convocado com sucesso. Prazo limite: {$waitlist->limite_comparecimento_em?->format('d/m/Y')}.",
        ]);
    }

    public function converterMatricula(WaitlistConverterMatriculaRequest $request, string $id): JsonResponse
    {
        $this->authorize('converter', EducaWaitlist::class);

        $dadosMatricula = $request->validated();
        $matricula = $this->converterService->converterEmMatricula($id, $dadosMatricula);

        return response()->json([
            'data' => $matricula,
            'message' => "Matrícula {$matricula->codigo_matricula} efetivada com sucesso a partir da fila de espera.",
        ], 201);
    }

    public function desistencia(Request $request, string $id): JsonResponse
    {
        $this->authorize('manage', EducaWaitlist::class);

        $request->validate([
            'motivo' => ['nullable', 'string', 'max:500'],
        ]);

        $waitlist = $this->converterService->registrarDesistencia(
            $id,
            $request->input('motivo', 'Desistência registrada pelo responsável ou perda de prazo')
        );

        return response()->json([
            'data' => $waitlist,
            'message' => 'Desistência da vaga registrada e posição liberada na fila.',
        ]);
    }

    /**
     * Consulta pública transparente da fila de espera anonimizada (LGPD / Lei nº 14.685/2023).
     * Endpoint aberto sem necessidade de autenticação.
     */
    public function consultaPublica(Request $request): JsonResponse
    {
        $request->validate([
            'school_id' => ['required', 'string'],
            'etapa_ensino' => ['required', 'string'],
            'numero_protocolo' => ['nullable', 'string'],
        ]);

        $resultado = $this->rankingService->listarConsultaPublica([
            'school_id' => $request->input('school_id'),
            'etapa_ensino' => $request->input('etapa_ensino'),
            'numero_protocolo' => $request->input('numero_protocolo'),
        ]);

        return response()->json([
            'data' => $resultado,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\IncidentAcknowledgeRequest;
use Modules\Educa\Http\Requests\IncidentActionCreateRequest;
use Modules\Educa\Http\Requests\IncidentCreateRequest;
use Modules\Educa\Models\EducaStudentIncident;
use Modules\Educa\Services\IncidentService;

final class IncidentController extends Controller
{
    public function __construct(
        private readonly IncidentService $incidentService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewOcorrencias', EducaStudentIncident::class);

        $ocorrencias = $this->incidentService->listar([
            'school_id' => $request->query('school_id'),
            'enrollment_id' => $request->query('enrollment_id'),
            'tipo' => $request->query('tipo'),
            'gravidade' => $request->query('gravidade'),
            'status' => $request->query('status'),
            'busca' => $request->query('busca'),
        ]);

        return response()->json([
            'data' => $ocorrencias,
        ]);
    }

    public function store(IncidentCreateRequest $request): JsonResponse
    {
        $this->authorize('manageOcorrencias', EducaStudentIncident::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();
        $dados['autor_user_id'] = $request->user()?->id;

        try {
            $ocorrencia = $this->incidentService->criar($dados);

            return response()->json([
                'data' => $ocorrencia,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $ocorrenciaId): JsonResponse
    {
        $this->authorize('viewOcorrencias', EducaStudentIncident::class);

        $ocorrencia = $this->incidentService->obter($ocorrenciaId);

        return response()->json([
            'data' => $ocorrencia,
        ]);
    }

    public function update(Request $request, string $ocorrenciaId): JsonResponse
    {
        $this->authorize('manageOcorrencias', EducaStudentIncident::class);

        $dados = $request->validate([
            'tipo' => ['nullable', 'string', 'in:disciplinar,pedagogica,saude,elogio'],
            'gravidade' => ['nullable', 'string', 'in:baixa,media,alta,gravissima'],
            'relato' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:aberta,em_analise,concluida,cientificada'],
        ]);

        try {
            $ocorrencia = $this->incidentService->atualizar($ocorrenciaId, $dados);

            return response()->json([
                'data' => $ocorrencia,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function adicionarAcao(IncidentActionCreateRequest $request, string $ocorrenciaId): JsonResponse
    {
        $this->authorize('manageOcorrencias', EducaStudentIncident::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();
        $dados['operador_user_id'] = $request->user()?->id;

        try {
            $acao = $this->incidentService->adicionarAcao($ocorrenciaId, $dados);

            return response()->json([
                'data' => $acao,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function registrarCiencia(IncidentAcknowledgeRequest $request, string $ocorrenciaId): JsonResponse
    {
        $this->authorize('manageOcorrencias', EducaStudentIncident::class);

        $responsavelPessoaId = (int) $request->validated('responsavel_pessoa_id');
        $observacao = $request->validated('observacao');

        try {
            $ocorrencia = $this->incidentService->registrarCiencia($ocorrenciaId, $responsavelPessoaId, $observacao);

            return response()->json([
                'data' => $ocorrencia,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

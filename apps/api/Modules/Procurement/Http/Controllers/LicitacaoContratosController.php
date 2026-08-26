<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoContrato;
use Modules\Procurement\Models\LicitacaoMedicao;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\ContractExecutionService;
use Modules\Procurement\Services\PncpIntegrationService;

final class LicitacaoContratosController extends Controller
{
    public function __construct(
        private readonly ContractExecutionService $contractService,
        private readonly AuditHMACService $audit,
        private readonly PncpIntegrationService $pncp
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = LicitacaoContrato::query()
            ->with(['licitacao', 'gestor', 'fiscal', 'aditivos', 'medicoes', 'pagamentos']);

        if ($request->filled('licitacao_id')) {
            $query->where('licitacao_id', (int) $request->query('licitacao_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $contratos = $query->orderBy('id', 'desc')->paginate(20);

        return response()->json($contratos);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'licitacao_id' => ['nullable', 'integer', 'exists:licitacoes,id'],
            'numero' => ['required', 'string', 'max:50'],
            'objeto' => ['required', 'string', 'min:10'],
            'fornecedor_nome' => ['required', 'string', 'max:255'],
            'fornecedor_cnpj' => ['required', 'string', 'size:14'],
            'valor_inicial_cents' => ['required', 'integer', 'min:1'],
            'vigencia_inicio' => ['required', 'date'],
            'vigencia_fim' => ['required', 'date', 'after:vigencia_inicio'],
            'gestor_id' => ['nullable', 'integer', 'exists:users,id'],
            'fiscal_id' => ['nullable', 'integer', 'exists:users,id'],
            'garantia_tipo' => ['nullable', 'string'],
            'garantia_valor_cents' => ['nullable', 'integer'],
        ]);

        $tenantId = app(\App\Support\TenantContext::class)->id();

        $contrato = LicitacaoContrato::create(array_merge($validated, [
            'tenant_id' => $tenantId,
            'valor_atualizado_cents' => $validated['valor_inicial_cents'],
            'status' => 'vigente',
        ]));

        // Sincronização assíncrona com PNCP
        $this->pncp->publishContract($contrato);

        $this->audit->record(
            'procurement',
            'contrato.created',
            "Contrato Administrativo #{$contrato->numero} cadastrado",
            null,
            $contrato->toArray()
        );

        return response()->json($contrato, 201);
    }

    public function show(int $id): JsonResponse
    {
        $contrato = LicitacaoContrato::with([
            'licitacao',
            'gestor',
            'fiscal',
            'aditivos.assinante',
            'medicoes.fiscal',
            'pagamentos',
        ])->findOrFail($id);

        return response()->json($contrato);
    }

    /**
     * Cadastro de Aditivos com bloqueio legal de limite 25%/50% (RN-009)
     */
    public function storeAditivo(Request $request, int $contratoId): JsonResponse
    {
        $contrato = LicitacaoContrato::findOrFail($contratoId);

        $validated = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'tipo' => ['required', 'string', 'in:aditivo_acrescimo,aditivo_supressao,aditivo_prazo,apostilamento'],
            'valor_cents' => ['required', 'integer'],
            'motivo' => ['required', 'string', 'min:10'],
            'nova_vigencia_fim' => ['nullable', 'date'],
        ]);

        try {
            $aditivo = $this->contractService->createAddendum(
                $contrato,
                $validated['numero'],
                $validated['tipo'],
                $validated['valor_cents'],
                $validated['motivo'],
                $validated['nova_vigencia_fim'] ?? null
            );
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->audit->record(
            'procurement',
            'aditivo.created',
            "Termo Aditivo #{$aditivo->numero} ao Contrato #{$contrato->numero}",
            null,
            $aditivo->toArray()
        );

        return response()->json($aditivo, 201);
    }

    /**
     * Registro de medições e atestes de serviços/obras
     */
    public function storeMedicao(Request $request, int $contratoId): JsonResponse
    {
        $contrato = LicitacaoContrato::findOrFail($contratoId);

        $validated = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'periodo' => ['required', 'string', 'max:100'],
            'valor_cents' => ['required', 'integer', 'min:1'],
            'observacoes' => ['nullable', 'string'],
        ]);

        $medicao = LicitacaoMedicao::create([
            'tenant_id' => $contrato->tenant_id,
            'contrato_id' => $contrato->id,
            'numero' => $validated['numero'],
            'periodo' => $validated['periodo'],
            'valor_cents' => $validated['valor_cents'],
            'observacoes' => $validated['observacoes'] ?? null,
            'status' => 'em_analise',
        ]);

        $this->audit->record(
            'procurement',
            'medicao.created',
            "Medição #{$medicao->numero} para o Contrato #{$contrato->numero}",
            null,
            $medicao->toArray()
        );

        return response()->json($medicao, 201);
    }

    /**
     * Registro de pagamentos com verificação do limite de 30 dias (RN-008)
     */
    public function storePagamento(Request $request, int $contratoId): JsonResponse
    {
        $contrato = LicitacaoContrato::findOrFail($contratoId);

        $validated = $request->validate([
            'nota_fiscal' => ['required', 'string', 'max:50'],
            'valor_cents' => ['required', 'integer', 'min:1'],
            'data_vencimento' => ['required', 'date'],
            'data_pagamento' => ['nullable', 'date'],
            'ordem_bancaria' => ['nullable', 'string', 'max:50'],
        ]);

        try {
            $pagamento = $this->contractService->registerPayment(
                $contrato,
                $validated['nota_fiscal'],
                $validated['valor_cents'],
                $validated['data_vencimento'],
                $validated['data_pagamento'] ?? null,
                $validated['ordem_bancaria'] ?? null
            );
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->audit->record(
            'procurement',
            'pagamento.registered',
            "Pagamento NF #{$pagamento->nota_fiscal} no valor de R$ " . number_format($pagamento->valor_cents / 100, 2, ',', '.'),
            null,
            $pagamento->toArray()
        );

        return response()->json($pagamento, 201);
    }
}

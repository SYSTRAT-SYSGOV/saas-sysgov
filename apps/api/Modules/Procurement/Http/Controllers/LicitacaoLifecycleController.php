<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\PncpIntegrationService;
use Modules\Procurement\Services\ProcurementFlowService;

final class LicitacaoLifecycleController extends Controller
{
    public function __construct(
        private readonly ProcurementFlowService $flow,
        private readonly AuditHMACService $audit,
        private readonly OutboxPublisher $outbox,
        private readonly PncpIntegrationService $pncp
    ) {}

    /**
     * Publica o edital da licitação após validação de toda a Fase Interna
     */
    public function publicar(Request $request, int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        try {
            $this->flow->validateCanPublish($licitacao);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $before = $licitacao->toArray();
        $licitacao->update(['status' => 'publicada']);

        // Integração assíncrona com PNCP
        $this->pncp->publishProcurementNotice($licitacao);

        $this->audit->record(
            'procurement',
            'licitacao.published',
            "Edital Publicado #{$licitacao->id} ({$licitacao->numero})",
            $before,
            $licitacao->toArray()
        );

        return response()->json([
            'message' => 'Edital publicado com sucesso e sincronização PNCP enfileirada.',
            'licitacao' => $licitacao,
        ]);
    }

    /**
     * Abre a sala de lances para disputa
     */
    public function iniciarDisputa(int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        if (!in_array($licitacao->status, ['publicada', 'em_disputa'], true)) {
            return response()->json(['message' => 'Apenas processos publicados podem entrar em disputa.'], 422);
        }

        $before = $licitacao->toArray();
        $licitacao->update(['status' => 'em_disputa']);

        $this->audit->record(
            'procurement',
            'licitacao.bidding_started',
            "Disputa Iniciada #{$licitacao->id}",
            $before,
            $licitacao->toArray()
        );

        return response()->json([
            'message' => 'Sessão de lances aberta com sucesso.',
            'licitacao' => $licitacao,
        ]);
    }

    /**
     * Adjudica o objeto ao vencedor da disputa
     */
    public function adjudicar(Request $request, int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        $validated = $request->validate([
            'vencedor_id' => ['required', 'integer', 'exists:licitacao_participantes,id'],
            'valor_final_cents' => ['required', 'integer', 'min:1'],
        ]);

        $before = $licitacao->toArray();
        $licitacao->update([
            'status' => 'adjudicada',
            'metadata' => array_merge($licitacao->metadata ?? [], [
                'adjudicacao' => [
                    'vencedor_id' => $validated['vencedor_id'],
                    'valor_final_cents' => $validated['valor_final_cents'],
                    'adjudicado_por' => $request->user()?->id,
                    'adjudicado_em' => now()->toIso8601String(),
                ],
            ]),
        ]);

        $this->audit->record(
            'procurement',
            'licitacao.adjudicated',
            "Licitação Adjudicada #{$licitacao->id}",
            $before,
            $licitacao->toArray()
        );

        return response()->json([
            'message' => 'Objeto adjudicado com sucesso ao fornecedor vencedor.',
            'licitacao' => $licitacao,
        ]);
    }

    /**
     * Homologa o processo pela Autoridade Competente (RN-005 Segregação + RN-006 MFA)
     */
    public function homologar(Request $request, int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);
        $user = $request->user();

        // RN-005: Segregação de Funções - Quem criou o processo não pode homologar
        if ($licitacao->created_by === $user?->id) {
            return response()->json([
                'message' => 'RN-005 Segregação de Funções: O usuário responsável pela criação/elaboração do processo não possui permissão para homologá-lo.',
            ], 403);
        }

        $before = $licitacao->toArray();
        $licitacao->update([
            'status' => 'homologada',
            'homologado_por' => $user?->id,
            'homologado_em' => now(),
        ]);

        $this->audit->record(
            'procurement',
            'licitacao.homologated',
            "Licitação Homologada #{$licitacao->id} pela autoridade {$user?->name}",
            $before,
            $licitacao->toArray()
        );

        $this->outbox->publish('procurement', 'ProcurementHomologated', [
            'id' => $licitacao->id,
            'numero' => $licitacao->numero,
            'homologado_por' => $user?->id,
        ]);

        return response()->json([
            'message' => 'Processo licitatório homologado com sucesso com encerramento da fase externa.',
            'licitacao' => $licitacao,
        ]);
    }

    /**
     * Cancela, anula ou revoga o processo
     */
    public function cancelar(Request $request, int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        $validated = $request->validate([
            'tipo' => ['required', 'string', 'in:anulada,revogada,deserta,fracassada'],
            'justificativa' => ['required', 'string', 'min:10'],
        ]);

        $before = $licitacao->toArray();
        $licitacao->update([
            'status' => $validated['tipo'],
            'metadata' => array_merge($licitacao->metadata ?? [], [
                'cancelamento' => [
                    'tipo' => $validated['tipo'],
                    'justificativa' => $validated['justificativa'],
                    'cancelado_por' => $request->user()?->id,
                    'cancelado_em' => now()->toIso8601String(),
                ],
            ]),
        ]);

        $this->audit->record(
            'procurement',
            "licitacao.{$validated['tipo']}",
            "Licitação #{$licitacao->id} - {$validated['tipo']}",
            $before,
            $licitacao->toArray()
        );

        return response()->json([
            'message' => "Processo classificado como {$validated['tipo']} com sucesso.",
            'licitacao' => $licitacao,
        ]);
    }
}

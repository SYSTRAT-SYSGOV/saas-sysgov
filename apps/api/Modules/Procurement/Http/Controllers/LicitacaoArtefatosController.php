<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoArtefato;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\ProcurementFlowService;

final class LicitacaoArtefatosController extends Controller
{
    public function __construct(
        private readonly ProcurementFlowService $flow,
        private readonly AuditHMACService $audit
    ) {}

    public function store(Request $request, int $licitacaoId): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($licitacaoId);

        $validated = $request->validate([
            'tipo' => ['required', 'string', 'in:dfd,etp,matriz_riscos,pesquisa_mercado,tr,parecer'],
            'conteudo' => ['required', 'array'],
        ]);

        // RN-002: Validar pré-requisitos sequenciais
        try {
            $this->flow->validateArtifactPrerequisites($licitacao, $validated['tipo']);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $artefato = LicitacaoArtefato::updateOrCreate(
            [
                'tenant_id' => $licitacao->tenant_id,
                'licitacao_id' => $licitacao->id,
                'tipo' => $validated['tipo'],
            ],
            [
                'conteudo' => $validated['conteudo'],
                'status' => 'rascunho',
                'created_by' => $request->user()?->id,
            ]
        );

        $this->audit->record(
            'procurement',
            "artefato.{$validated['tipo']}.saved",
            "Artefato {$validated['tipo']} salvo para Licitação #{$licitacao->id}",
            null,
            $artefato->toArray()
        );

        return response()->json($artefato, 201);
    }

    public function enviarParaAnalise(int $licitacaoId, string $tipo): JsonResponse
    {
        $artefato = LicitacaoArtefato::where('licitacao_id', $licitacaoId)
            ->where('tipo', $tipo)
            ->firstOrFail();

        $before = $artefato->toArray();
        $artefato->update(['status' => 'em_analise']);

        $this->audit->record(
            'procurement',
            "artefato.{$tipo}.submitted",
            "Artefato {$tipo} enviado para análise",
            $before,
            $artefato->toArray()
        );

        return response()->json([
            'message' => "Artefato {$tipo} enviado para análise com sucesso.",
            'artefato' => $artefato,
        ]);
    }

    /**
     * RN-005: Segregação de Funções na aprovação de artefatos
     */
    public function aprovar(Request $request, int $licitacaoId, string $tipo): JsonResponse
    {
        $artefato = LicitacaoArtefato::where('licitacao_id', $licitacaoId)
            ->where('tipo', $tipo)
            ->firstOrFail();

        $user = $request->user();

        // RN-005: Quem elaborou o artefato NÃO pode aprová-lo
        if ($artefato->created_by === $user?->id) {
            return response()->json([
                'message' => "RN-005 Segregação de Funções: O usuário elaborador da peça ({$user?->name}) não pode aprová-la.",
            ], 403);
        }

        $before = $artefato->toArray();
        $artefato->update([
            'status' => 'aprovado',
            'aprovado_por' => $user?->id,
            'aprovado_em' => now(),
            'justificativa_reprovacao' => null,
        ]);

        $this->audit->record(
            'procurement',
            "artefato.{$tipo}.approved",
            "Artefato {$tipo} aprovado por {$user?->name}",
            $before,
            $artefato->toArray()
        );

        return response()->json([
            'message' => "Artefato {$tipo} aprovado com sucesso.",
            'artefato' => $artefato,
        ]);
    }

    public function reprovar(Request $request, int $licitacaoId, string $tipo): JsonResponse
    {
        $request->validate(['justificativa' => ['required', 'string', 'min:5']]);

        $artefato = LicitacaoArtefato::where('licitacao_id', $licitacaoId)
            ->where('tipo', $tipo)
            ->firstOrFail();

        $before = $artefato->toArray();
        $artefato->update([
            'status' => 'reprovado',
            'justificativa_reprovacao' => $request->input('justificativa'),
        ]);

        $this->audit->record(
            'procurement',
            "artefato.{$tipo}.rejected",
            "Artefato {$tipo} reprovado",
            $before,
            $artefato->toArray()
        );

        return response()->json([
            'message' => "Artefato {$tipo} reprovado.",
            'artefato' => $artefato,
        ]);
    }
}

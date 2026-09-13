<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Recurso;

/**
 * Serviço de Homologação em Lote do Ciclo de Avaliação (RN-C07, RN-C08, RN-C09).
 *
 * RN-C07: Torna todas as avaliações do ciclo imutáveis.
 * RN-C08: Bloqueia homologação caso haja recursos pendentes de julgamento.
 * RN-C09: Publica evento assíncrono outbox 'capd.ciclo_homologado' para integração com RH/Folha.
 */
final class HomologacaoLoteService
{
    public function __construct(
        private readonly OutboxPublisher $outbox,
        private readonly AuditLogger     $audit,
    ) {}

    /**
     * Homologa todas as avaliações de um ciclo e dispara integração via Outbox.
     *
     * @return array{total_homologadas: int, total_elegiveis: int, outbox_event_id: int}
     *
     * @throws \DomainException Se houver recursos pendentes ou ciclo inválido
     */
    public function homologarCiclo(CicloAvaliacao $ciclo, int $homologadoPorUserId): array
    {
        $tenantId = (int) app(TenantContext::class)->id();

        // ── RN-C08: Valida que não existem recursos pendentes ─────────
        $recursosPendentes = Recurso::query()
            ->whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $ciclo->id))
            ->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
            ->count();

        if ($recursosPendentes > 0) {
            throw new \DomainException(
                "Não é possível homologar o ciclo. Existem {$recursosPendentes} recurso(s) administrativo(s) pendente(s) de julgamento."
            );
        }

        return DB::transaction(function () use ($ciclo, $homologadoPorUserId, $tenantId): array {
            $agora = now();

            // ── RN-C07: Torna todas as avaliações concluídas imutáveis ─
            $totalHomologadas = Avaliacao::query()
                ->where('ciclo_id', $ciclo->id)
                ->whereNotNull('data_conclusao')
                ->where('homologada', false)
                ->update([
                    'homologada'     => true,
                    'homologada_em'  => $agora,
                    'homologada_por' => $homologadoPorUserId,
                ]);

            $totalElegiveis = Avaliacao::query()
                ->where('ciclo_id', $ciclo->id)
                ->where('elegivel_progressao', true)
                ->count();

            // Atualiza status do ciclo
            $ciclo->update([
                'status' => CicloAvaliacao::STATUS_HOMOLOGADO,
            ]);

            // ── RN-C09: Publicação Outbox para sincronização com Folha/IPM ─
            $outboxEvent = $this->outbox->publish(
                'capd.ciclo_homologado',
                [
                    'ciclo_id'          => $ciclo->id,
                    'ano_referencia'    => $ciclo->ano_referencia,
                    'total_avaliacoes'  => $totalHomologadas,
                    'total_elegiveis'   => $totalElegiveis,
                    'homologado_em'     => $agora->toIso8601String(),
                    'homologado_por'    => $homologadoPorUserId,
                ],
                $tenantId,
            );

            $this->audit->record(
                'capd',
                'ciclo.homologado',
                "Ciclo #{$ciclo->id} ({$ciclo->nome}) homologado em lote: {$totalHomologadas} avaliações seladas, {$totalElegiveis} servidores aptos à progressão",
                null,
                [
                    'ciclo_id'          => $ciclo->id,
                    'total_homologadas' => $totalHomologadas,
                    'total_elegiveis'   => $totalElegiveis,
                    'outbox_id'         => $outboxEvent->id,
                ],
            );

            return [
                'total_homologadas' => $totalHomologadas,
                'total_elegiveis'   => $totalElegiveis,
                'outbox_event_id'   => $outboxEvent->id,
            ];
        });
    }
}

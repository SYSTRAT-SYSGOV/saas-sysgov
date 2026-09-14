<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\PlanoMelhoria;
use Modules\Capd\Models\Servidor;

/**
 * Gestão dos Planos de Melhoria de Desempenho (PMD) — RF-09.
 *
 * Um PMD é criado quando o servidor atinge conceito Regular ou Insuficiente
 * (faixas configuráveis) no ciclo. É vinculado ao próximo ciclo avaliativo
 * como fator de verificação de evolução.
 */
final class PmdService
{
    public function __construct(
        private readonly AuditLogger    $audit,
        private readonly TenantContext  $tenantContext,
    ) {}

    /**
     * Cria ou atualiza o PMD de um servidor.
     *
     * Chamado automaticamente por ConsolidacaoController::processar() quando
     * o conceito do ciclo é Regular ou Insuficiente. Vincula ao próximo ciclo
     * da cadência.
     *
     * @param array<string, mixed> $dados — objetivos, acoes, prazo, responsavel_id
     */
    public function criarParaServidor(
        Servidor       $servidor,
        CicloAvaliacao $ciclo,
        string         $nfc,
        ?string        $conceito = null,
        ?Avaliacao     $avaliacao = null,
        array          $dados = [],
    ): PlanoMelhoria {
        // Determina o próximo ciclo da cadência para vinculação
        $proximoCiclo = CicloAvaliacao::query()
            ->where('tenant_id', $ciclo->tenant_id)
            ->where('ano_competencia', '>', $ciclo->ano_competencia)
            ->orderBy('ano_competencia')
            ->first();

        return DB::transaction(function () use ($servidor, $ciclo, $nfc, $conceito, $avaliacao, $dados, $proximoCiclo): PlanoMelhoria {
            // Supersede PMDs anteriores ainda não verificados do mesmo servidor+ciclo
            PlanoMelhoria::query()
                ->where('tenant_id', $ciclo->tenant_id)
                ->where('servidor_id', $servidor->id)
                ->where('ciclo_id', $ciclo->id)
                ->whereIn('status', [PlanoMelhoria::STATUS_ABERTO, PlanoMelhoria::STATUS_EM_ANDAMENTO, PlanoMelhoria::STATUS_CONCLUIDO])
                ->update(['status' => PlanoMelhoria::STATUS_CANCELADO]);

            $prazo = $dados['prazo'] ?? ($proximoCiclo?->data_inicio ?? now()->addYear()->toDateString());

            $pmd = PlanoMelhoria::create([
                'tenant_id'            => $ciclo->tenant_id,
                'avaliacao_id'         => $avaliacao?->id,
                'servidor_id'          => $servidor->id,
                'responsavel_id'       => $dados['responsavel_id'] ?? $servidor->chefia_imediata_id ?? null,
                'ciclo_id'             => $ciclo->id,
                'ciclo_verificacao_id' => $proximoCiclo?->id,
                'nfc_gatilho'          => $nfc,
                'conceito_atingido'    => $conceito,
                'objetivos'            => $dados['objetivos'] ?? 'Melhoria de desempenho funcional conforme identificado na avaliação periódica.',
                'acoes'                => $dados['acoes'] ?? null,
                'prazo'                => $prazo,
                'status'               => PlanoMelhoria::STATUS_ABERTO,
            ]);

            // Evento para integração assíncrona (notifica RH)
            OutboxPublisher::dispatch('capd.pmd.criado', [
                'tenant_id'   => $ciclo->tenant_id,
                'pmd_id'      => $pmd->id,
                'servidor_id' => $servidor->id,
                'ciclo_id'    => $ciclo->id,
                'nfc'         => $nfc,
                'conceito'    => $conceito,
            ]);

            $this->audit->record(
                'capd',
                'pmd.criado',
                "PMD criado para servidor #{$servidor->id}: conceito={$conceito} (NFC={$nfc})",
                null,
                ['pmd_id' => $pmd->id, 'nfc' => $nfc, 'conceito' => $conceito]
            );

            return $pmd;
        });
    }

    /**
     * Atualiza dados do PMD (objetivos, ações, prazo, status).
     *
     * @param array<string, mixed> $dados
     */
    public function atualizar(PlanoMelhoria $pmd, array $dados): PlanoMelhoria
    {
        if (! $pmd->estaAtivo()) {
            throw new DomainException("PMD #{$pmd->id} não pode ser editado (status: {$pmd->status}).");
        }

        $before = $pmd->toArray();
        $pmd->update(array_intersect_key($dados, array_flip([
            'objetivos',
            'acoes',
            'prazo',
            'status',
            'responsavel_id',
            'ciclo_verificacao_id',
            'observacoes_verificacao',
        ])));

        $this->audit->record(
            'capd',
            'pmd.atualizado',
            "PMD #{$pmd->id} atualizado",
            $before,
            $pmd->fresh()->toArray()
        );

        return $pmd->fresh();
    }

    /**
     * Marca as ações do plano como executadas pelo responsável — ainda não é
     * a verificação de evolução (isso só acontece no ciclo de verificação,
     * via verificarEvolucao()).
     */
    public function concluirAcoes(PlanoMelhoria $pmd): PlanoMelhoria
    {
        if (! in_array($pmd->status, [PlanoMelhoria::STATUS_ABERTO, PlanoMelhoria::STATUS_EM_ANDAMENTO], true)) {
            throw new DomainException("PMD #{$pmd->id} não pode ter as ações concluídas (status: {$pmd->status}).");
        }

        $before = $pmd->toArray();
        $pmd->update([
            'status'       => PlanoMelhoria::STATUS_CONCLUIDO,
            'concluido_em' => now(),
        ]);

        $this->audit->record('capd', 'pmd.acoes_concluidas', "PMD #{$pmd->id} — ações concluídas pelo responsável", $before, $pmd->fresh()->toArray());

        return $pmd->fresh();
    }

    /**
     * Registra a verificação de evolução do PMD no ciclo de verificação.
     * Sempre move o status para "verificado" — o booleano `evoluiu` no
     * retorno é o resultado informativo da reavaliação, não um novo status.
     *
     * @return array{evoluiu: bool, observacoes: string}
     */
    public function verificarEvolucao(PlanoMelhoria $pmd, string $nfcNovoCiclo, string $observacoes, ?int $verificadoPor = null): array
    {
        $nfcAnterior = (float) $pmd->nfc_gatilho;
        $nfcNova     = (float) $nfcNovoCiclo;
        $evoluiu     = $nfcNova > $nfcAnterior;

        $before = $pmd->toArray();
        $pmd->update([
            'status'                  => PlanoMelhoria::STATUS_VERIFICADO,
            'observacoes_verificacao' => $observacoes,
            'verificado_em'           => now(),
            'verificado_por'          => $verificadoPor,
        ]);

        $this->audit->record(
            'capd',
            'pmd.verificacao',
            "PMD #{$pmd->id}: NFC anterior={$nfcAnterior} | NFC nova={$nfcNovoCiclo} | " . ($evoluiu ? 'EVOLUIU' : 'NÃO EVOLUIU'),
            $before,
            $pmd->fresh()->toArray()
        );

        return [
            'evoluiu'     => $evoluiu,
            'observacoes' => $observacoes,
        ];
    }

    /**
     * RF-09 — verifica se o servidor tem um PMD pendente de verificação de
     * evolução vinculado ao ciclo informado (ciclo_verificacao_id).
     *
     * Usado como fator de bloqueio da elegibilidade de progressão: um PMD
     * ainda não verificado (aberto, em andamento ou com ações já concluídas,
     * mas sem a reavaliação registrada) no ciclo em que deveria ser
     * verificado impede a progressão até que a evolução seja registrada.
     */
    public function possuiPmdPendenteNoCiclo(int $servidorId, int $cicloId): bool
    {
        return PlanoMelhoria::query()
            ->where('servidor_id', $servidorId)
            ->where('ciclo_verificacao_id', $cicloId)
            ->whereIn('status', [PlanoMelhoria::STATUS_ABERTO, PlanoMelhoria::STATUS_EM_ANDAMENTO, PlanoMelhoria::STATUS_CONCLUIDO])
            ->exists();
    }

    /**
     * Lista PMDs com filtros opcionais.
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, PlanoMelhoria>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = PlanoMelhoria::with(['ciclo', 'cicloVerificacao'])
            ->orderByDesc('created_at');

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['ciclo_id'])) {
            $query->where('ciclo_id', (int) $filtros['ciclo_id']);
        }

        if (! empty($filtros['servidor_id'])) {
            $query->where('servidor_id', (int) $filtros['servidor_id']);
        }

        return $query->get();
    }
}

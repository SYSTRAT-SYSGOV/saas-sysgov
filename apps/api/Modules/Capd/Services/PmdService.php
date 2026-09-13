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
 * Um PMD é criado quando o servidor atinge NFC inferior à nota_corte_nfc do ciclo.
 * É vinculado ao próximo ciclo avaliativo como fator de verificação de evolução.
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
     * Chamado automaticamente por CicloService::consolidarNfcTrienal()
     * quando NFC < nota_corte_nfc. Vincula ao próximo ciclo da cadência.
     *
     * @param array<string, mixed> $dados — objetivos, acoes, prazo
     */
    public function criarParaServidor(
        Servidor       $servidor,
        CicloAvaliacao $ciclo,
        string         $nfc,
        ?Avaliacao     $avaliacao = null,
        array          $dados = [],
    ): PlanoMelhoria {
        // Determina o próximo ciclo da cadência para vinculação
        $proximoCiclo = CicloAvaliacao::query()
            ->where('tenant_id', $ciclo->tenant_id)
            ->where('ano_competencia', '>', $ciclo->ano_competencia)
            ->orderBy('ano_competencia')
            ->first();

        return DB::transaction(function () use ($servidor, $ciclo, $nfc, $avaliacao, $dados, $proximoCiclo): PlanoMelhoria {
            // Cancela PMDs anteriores pendentes do mesmo servidor no mesmo ciclo
            PlanoMelhoria::query()
                ->where('tenant_id', $ciclo->tenant_id)
                ->where('servidor_id', $servidor->id)
                ->where('ciclo_id', $ciclo->id)
                ->whereIn('status', [PlanoMelhoria::STATUS_PENDENTE, PlanoMelhoria::STATUS_EM_ANDAMENTO])
                ->update(['status' => PlanoMelhoria::STATUS_CANCELADO]);

            $prazo = $dados['prazo'] ?? ($proximoCiclo?->data_inicio ?? now()->addYear()->toDateString());

            $pmd = PlanoMelhoria::create([
                'tenant_id'            => $ciclo->tenant_id,
                'avaliacao_id'         => $avaliacao?->id,
                'servidor_id'          => $servidor->id,
                'ciclo_id'             => $ciclo->id,
                'ciclo_verificacao_id' => $proximoCiclo?->id,
                'nfc_gatilho'          => $nfc,
                'objetivos'            => $dados['objetivos'] ?? 'Melhoria de desempenho funcional conforme identificado na avaliação periódica.',
                'acoes'                => $dados['acoes'] ?? null,
                'prazo'                => $prazo,
                'status'               => PlanoMelhoria::STATUS_PENDENTE,
            ]);

            // Evento para integração assíncrona (notifica RH)
            OutboxPublisher::dispatch('capd.pmd.criado', [
                'tenant_id'   => $ciclo->tenant_id,
                'pmd_id'      => $pmd->id,
                'servidor_id' => $servidor->id,
                'ciclo_id'    => $ciclo->id,
                'nfc'         => $nfc,
            ]);

            $this->audit->record(
                'capd',
                'pmd.criado',
                "PMD criado para servidor #{$servidor->id}: NFC={$nfc} abaixo da nota de corte {$ciclo->nota_corte_nfc}",
                null,
                ['pmd_id' => $pmd->id, 'nfc' => $nfc]
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
     * Registra a verificação de evolução do PMD no ciclo de verificação.
     *
     * @return array{evoluiu: bool, observacoes: string}
     */
    public function verificarEvolucao(PlanoMelhoria $pmd, string $nfcNovoCiclo, string $observacoes): array
    {
        $nfcAnterior = (float) $pmd->nfc_gatilho;
        $nfcNova     = (float) $nfcNovoCiclo;
        $evoluiu     = $nfcNova > $nfcAnterior;

        $novoStatus = $evoluiu ? PlanoMelhoria::STATUS_CONCLUIDO : PlanoMelhoria::STATUS_EM_ANDAMENTO;

        $before = $pmd->toArray();
        $pmd->update([
            'status'                  => $novoStatus,
            'observacoes_verificacao' => $observacoes,
            'concluido_em'            => $evoluiu ? now() : null,
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

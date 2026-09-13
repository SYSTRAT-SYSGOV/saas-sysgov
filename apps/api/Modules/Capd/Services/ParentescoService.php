<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\PendenciaHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Support\ResolvedAvaliador;

/**
 * Serviço de Detecção e Gestão de Impedimentos e Parentesco (Art. 13 • RN-07).
 *
 * Avaliadores com relação de parentesco (cônjuge, companheiro ou parentes
 * em linha reta/colateral até o 3º grau por consanguinidade ou afinidade)
 * com seus subordinados ficam automaticamente impedidos de avaliá-los.
 *
 * O sistema emite alerta, bloqueia o formulário e transfere a atribuição
 * para o superior hierárquico substituto.
 */
final class ParentescoService
{
    public function __construct(
        private AuditLogger $audit,
        private TenantContext $tenantContext,
        private HierarquiaService $hierarquiaService,
    ) {
    }

    /**
     * Verifica se existe impedimento ativo entre avaliador e avaliado.
     */
    public function verificarImpedimento(int $avaliadorUserId, int $servidorId): ?array
    {
        $tenantId = $this->tenantContext->getTenantId();

        // 1. Busca impedimento cadastrado na tabela de impedimentos
        $impedimento = Impedimento::query()
            ->where('tenant_id', $tenantId)
            ->where('servidor_alvo_id', $servidorId)
            ->where(function ($q) use ($avaliadorUserId) {
                $q->where('declarado_por', $avaliadorUserId)
                  ->orWhereHas('membro', function ($m) use ($avaliadorUserId) {
                      $m->where('servidor_id', $avaliadorUserId);
                  });
            })
            ->first();

        if ($impedimento) {
            return [
                'impedido' => true,
                'tipo' => $impedimento->tipo_impedimento,
                'motivo' => $impedimento->motivo,
                'declarado_em' => $impedimento->declarado_em?->toIso8601String(),
            ];
        }

        return null;
    }

    /**
     * Registra impedimento formal por parentesco ou conflito de interesse.
     */
    public function registrarImpedimento(
        int $servidorAlvoId,
        string $tipoImpedimento,
        string $motivo,
        int $declaradoPorUserId,
        ?int $comissaoMembroId = null
    ): Impedimento {
        $tenantId = $this->tenantContext->getTenantId();

        $impedimento = Impedimento::create([
            'tenant_id'          => $tenantId,
            'servidor_alvo_id'   => $servidorAlvoId,
            'comissao_membro_id' => $comissaoMembroId ?? 0,
            'tipo_impedimento'   => $tipoImpedimento,
            'motivo'             => $motivo,
            'declarado_em'       => now(),
            'declarado_por'      => $declaradoPorUserId,
        ]);

        $this->audit->record(
            'capd',
            'impedimento.registrado',
            "Impedimento registrado para servidor #{$servidorAlvoId} (Tipo: {$tipoImpedimento})",
            null,
            [
                'servidor_alvo_id' => $servidorAlvoId,
                'tipo' => $tipoImpedimento,
                'motivo' => $motivo,
                'declarado_por' => $declaradoPorUserId,
                'timestamp' => now()->toIso8601String(),
            ]
        );

        return $impedimento;
    }

    /**
     * Lista todos os impedimentos para auditoria e controle interno.
     */
    public function listarImpedimentosAuditoria(): array
    {
        $tenantId = $this->tenantContext->getTenantId();

        return Impedimento::query()
            ->where('tenant_id', $tenantId)
            ->with(['servidorAlvo', 'declaradoPor', 'membro'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($imp) => [
                'id'                => $imp->id,
                'tipo'              => $imp->tipo_impedimento,
                'motivo'            => $imp->motivo,
                'declarado_em'      => $imp->declarado_em?->toIso8601String(),
                'servidor_alvo'     => $imp->servidorAlvo?->name ?? "ID #{$imp->servidor_alvo_id}",
                'declarado_por'     => $imp->declaradoPor?->name ?? "ID #{$imp->declarado_por}",
            ])
            ->all();
    }
}

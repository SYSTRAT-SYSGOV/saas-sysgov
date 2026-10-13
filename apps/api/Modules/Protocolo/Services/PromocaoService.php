<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\Vinculo;

final class PromocaoService
{
    public function __construct(
        private readonly ProcessoService $processoService,
        private readonly VinculoRegistry $vinculoRegistry,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * Promove uma entidade externa (ex: Requerimento) a processo administrativo.
     *
     * @param array<string, mixed> $dadosProcesso
     */
    public function promoverRequerimento(
        int $requerimentoId,
        array $dadosProcesso,
        string $entidadeTipo = 'requerimento',
    ): Processo {
        $handler = $this->vinculoRegistry->resolver($entidadeTipo);
        if ($handler === null) {
            throw new LogicException("Nenhum handler registrado para a entidade '{$entidadeTipo}'.", 422);
        }

        if (!$handler->existe($requerimentoId)) {
            throw new LogicException("Requerimento #{$requerimentoId} não encontrado.", 404);
        }

        if ($handler->jaPromovida($requerimentoId)) {
            throw new LogicException("Requerimento #{$requerimentoId} já foi promovido a processo.", 409);
        }

        $tenantId = app(TenantContext::class)->id();

        $vinculoExiste = Vinculo::query()
            ->where('tenant_id', $tenantId)
            ->where('entidade_tipo', $entidadeTipo)
            ->where('entidade_id', $requerimentoId)
            ->where('papel_vinculo', 'origem')
            ->exists();

        if ($vinculoExiste) {
            throw new LogicException("Já existe um processo vinculado como origem para este requerimento.", 409);
        }

        return DB::transaction(function () use ($requerimentoId, $dadosProcesso, $entidadeTipo, $handler, $tenantId): Processo {
            $resumo = $handler->resumo($requerimentoId);

            $assunto = !empty($dadosProcesso['assunto'])
                ? (string) $dadosProcesso['assunto']
                : ($resumo['titulo'] ?? "Requerimento #{$requerimentoId}");

            $dadosAbertura = array_merge($dadosProcesso, [
                'assunto' => $assunto,
                'origem' => 'externa',
                'orgao_origem_id' => (int) $dadosProcesso['orgao_destino_id'],
                'orgao_atual_id' => (int) $dadosProcesso['orgao_destino_id'],
            ]);

            $processo = $this->processoService->abrir(
                dadosProcesso: $dadosAbertura,
                atributos: (array) ($dadosProcesso['atributos'] ?? []),
                documentos: (array) ($dadosProcesso['documentos'] ?? []),
                dadosAndamentoInicial: !empty($dadosProcesso['andamento_inicial'])
                    ? (array) $dadosProcesso['andamento_inicial']
                    : [
                        'descricao' => "Abertura automática via promoção de {$entidadeTipo} #{$requerimentoId}",
                    ],
            );

            Vinculo::create([
                'tenant_id' => $tenantId,
                'processo_id' => $processo->id,
                'entidade_tipo' => $entidadeTipo,
                'entidade_id' => $requerimentoId,
                'papel_vinculo' => 'origem',
            ]);

            $handler->aoPromover($requerimentoId, $processo->id);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.promover_requerimento',
                resource: "Processo #{$processo->id} promovido a partir de {$entidadeTipo} #{$requerimentoId}",
                before: null,
                after: ['processo_id' => $processo->id, 'requerimento_id' => $requerimentoId],
            );

            return $processo;
        });
    }
}

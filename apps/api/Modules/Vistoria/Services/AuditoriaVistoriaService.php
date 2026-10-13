<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Models\AuditLog;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class AuditoriaVistoriaService
{
    public function __construct(
        private TenantContext $tenantContext,
    ) {}

    /**
     * Trilha de auditoria completa de uma vistoria: a própria execução, os documentos
     * emitidos a partir dela, as assinaturas coletadas em cada documento e o processo
     * sancionatório eventualmente aberto.
     *
     * `AuditLog` não é polimórfico (sem `auditable_type`/`auditable_id`, mesmo padrão de
     * `Modules\Requerimentos\Http\Controllers\AuditoriaController::proposicao()`) — o rastro de
     * cada registro é identificado pelo texto de `resource` que `AuditLogger::record()` grava
     * (ex. "Documento #5 (auto_infracao/5/2026)"). Como o sufixo depois do `#{id}` varia por
     * ação (algumas chamadas incluem contexto extra, outras não — ver `ProcessoSancionatorioService`),
     * o casamento usa `resource = prefixo` OU `resource LIKE 'prefixo %'`, nunca um `LIKE`
     * sem o espaço de ancoragem (evita que "Documento #1" capture "Documento #10").
     *
     * @return Collection<int, AuditLog>
     */
    public function obterTrilha(ExecucaoVistoria $execucao): Collection
    {
        $execucao->loadMissing(['documentos.assinaturas', 'documentos.processoSancionatorio']);

        $prefixos = ["ExecucaoVistoria #{$execucao->id}"];

        foreach ($execucao->documentos as $documento) {
            $prefixos[] = "Documento #{$documento->id}";

            foreach ($documento->assinaturas as $assinatura) {
                $prefixos[] = "Assinatura #{$assinatura->id}";
            }

            if ($documento->processoSancionatorio) {
                $prefixos[] = "ProcessoSancionatorio #{$documento->processoSancionatorio->id}";
            }
        }

        return AuditLog::query()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('module', 'vistoria')
            ->where(function (Builder $query) use ($prefixos): void {
                foreach ($prefixos as $prefixo) {
                    $query->orWhere('resource', $prefixo)->orWhere('resource', 'like', "{$prefixo} %");
                }
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'user_id', 'action', 'resource', 'before', 'after', 'created_at']);
    }
}

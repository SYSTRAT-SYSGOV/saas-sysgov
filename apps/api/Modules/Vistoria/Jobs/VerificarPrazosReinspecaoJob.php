<?php

declare(strict_types=1);

namespace Modules\Vistoria\Jobs;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Services\ReinspecaoService;

/**
 * Scheduler diário (seção 10.2): garante que todo auto de infração cujo prazo de
 * regularização já venceu tenha uma ordem de serviço de reinspeção agendada e o
 * acompanhamento de prazo criado. Rede de segurança — na maioria dos casos a OS e o
 * acompanhamento já foram criados no momento da emissão do documento
 * (`DocumentoService::emitirDocumento()` → `ReinspecaoService::agendar()`), mas este job
 * cobre qualquer auto que, por algum motivo, tenha ficado sem esse registro.
 *
 * A varredura em si roda sem `TenantContext` definido (mesmo padrão de
 * `VerificarPrazosProcessoJob`), mas `agendar()` pode criar registros (`Reinspecao`,
 * `OrdemServico`) que exigem tenant — diferente de `registrarRevelia()` (só `update()`),
 * por isso o `TenantContext` é definido/limpo por documento antes de cada chamada.
 */
final class VerificarPrazosReinspecaoJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function handle(ReinspecaoService $service, TenantContext $tenantContext): void
    {
        $documentosSemAcompanhamento = Documento::whereNotNull('prazo_limite')
            ->whereDate('prazo_limite', '<=', now()->toDateString())
            ->whereDoesntHave('reinspecao')
            ->get();

        foreach ($documentosSemAcompanhamento as $documento) {
            $tenant = Tenant::find($documento->tenant_id);
            if ($tenant === null) {
                continue;
            }

            $tenantContext->set($tenant);
            $service->agendar($documento);
            $tenantContext->clear();
        }
    }
}

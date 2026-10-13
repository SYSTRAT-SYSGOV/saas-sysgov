<?php

declare(strict_types=1);

namespace Modules\Vistoria\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\ProcessoSancionatorioService;

/**
 * Scheduler diário (seção 9.4): avança automaticamente, por revelia, os processos
 * sancionatórios com prazo vencido sem manifestação — tanto o prazo de defesa
 * (`aberto` → `em_julgamento`) quanto o prazo de recurso (`penalidade_aplicada` →
 * `concluido`). Roda sem `TenantContext` definido (job de scheduler, fora de uma
 * requisição) — mesmo padrão de `Modules\Requerimentos\Jobs\VerificarPrazosJob`, varrendo
 * todos os tenants de uma vez (o escopo global de `TenantAware` não filtra sem contexto).
 */
final class VerificarPrazosProcessoJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function handle(ProcessoSancionatorioService $service): void
    {
        $hoje = Carbon::today();

        $semDefesa = ProcessoSancionatorio::where('status', ProcessoSancionatorio::STATUS_ABERTO)
            ->whereDate('prazo_defesa_limite', '<', $hoje)
            ->whereNull('defesa_apresentada_em')
            ->get();

        foreach ($semDefesa as $processo) {
            $service->registrarRevelia($processo);
        }

        $semRecurso = ProcessoSancionatorio::where('status', ProcessoSancionatorio::STATUS_PENALIDADE_APLICADA)
            ->whereDate('prazo_recurso_limite', '<', $hoje)
            ->whereNull('recurso_apresentado_em')
            ->get();

        foreach ($semRecurso as $processo) {
            $service->registrarRevelia($processo);
        }
    }
}

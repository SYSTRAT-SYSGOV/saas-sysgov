<?php

declare(strict_types=1);

namespace Modules\Transporte\Jobs;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Transporte\Models\Importacao;
use Modules\Transporte\Services\ImportacaoTransporteService;

/** Processa a importação confirmada. Roda fora da requisição, então resolve o tenant à mão (como os demais jobs do projeto). */
final class ProcessarImportacaoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public readonly int $importacaoId, public readonly int $tenantId) {}

    public function handle(ImportacaoTransporteService $servico): void
    {
        $contexto = app(TenantContext::class);
        $anterior = $contexto->hasTenant() ? $contexto->get() : null;
        $contexto->set(Tenant::findOrFail($this->tenantId));

        try {
            $servico->processar(Importacao::query()->findOrFail($this->importacaoId));
        } finally {
            $anterior !== null ? $contexto->set($anterior) : $contexto->clear();
        }
    }
}

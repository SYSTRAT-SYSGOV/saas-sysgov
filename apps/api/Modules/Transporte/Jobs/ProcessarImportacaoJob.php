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
use Illuminate\Support\Facades\Storage;
use Modules\Transporte\Models\Importacao;
use Modules\Transporte\Services\ImportacaoCensoService;
use Modules\Transporte\Services\ImportacaoTransporteService;
use Throwable;

/** Processa a importação confirmada. Roda fora da requisição, então resolve o tenant à mão (como os demais jobs do projeto). */
final class ProcessarImportacaoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    /** Arquivos grandes do Educacenso levam minutos. O `retry_after` da conexão precisa ser maior que isto. */
    public int $timeout = 1800;

    public function __construct(public readonly int $importacaoId, public readonly int $tenantId) {}

    public function handle(ImportacaoTransporteService $servico, ImportacaoCensoService $censo): void
    {
        $contexto = app(TenantContext::class);
        $anterior = $contexto->hasTenant() ? $contexto->get() : null;
        $contexto->set(Tenant::findOrFail($this->tenantId));

        try {
            $importacao = Importacao::query()->findOrFail($this->importacaoId);
            $importacao->tipo === 'censo' ? $censo->processar($importacao) : $servico->processar($importacao);
        } finally {
            $anterior !== null ? $contexto->set($anterior) : $contexto->clear();
        }
    }

    /** Worker morto ou tempo esgotado: sem isto a importação ficaria para sempre em "na fila" ou "processando". */
    public function failed(?Throwable $e): void
    {
        $contexto = app(TenantContext::class);
        $anterior = $contexto->hasTenant() ? $contexto->get() : null;
        $contexto->set(Tenant::findOrFail($this->tenantId));

        try {
            $importacao = Importacao::query()->find($this->importacaoId);
            if ($importacao === null || !in_array($importacao->status, ['na_fila', 'processando'], true)) {
                return;
            }
            if ($importacao->arquivo_caminho !== null) {
                Storage::disk('local')->delete($importacao->arquivo_caminho);
            }
            $importacao->update(['status' => 'falha', 'mensagem' => 'O processamento foi interrompido. Envie o arquivo de novo.', 'arquivo_caminho' => null, 'concluida_em' => now()]);
        } finally {
            $anterior !== null ? $contexto->set($anterior) : $contexto->clear();
        }
    }
}

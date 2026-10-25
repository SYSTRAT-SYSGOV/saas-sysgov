<?php

declare(strict_types=1);

namespace Modules\Educa\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Educa\Models\EducaCensusExport;
use Modules\Educa\Services\CensusExportService;
use Throwable;

/**
 * Job assíncrono para geração em lote do arquivo do Censo Escolar (INEP).
 */
class ExportEducacensoJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 600; // 10 minutos
    public int $tries = 3;

    public function __construct(
        public EducaCensusExport $export
    ) {}

    public function handle(CensusExportService $exportService): void
    {
        try {
            $exportService->exportar($this->export);
        } catch (Throwable $e) {
            $this->export->update([
                'status' => EducaCensusExport::STATUS_FALHOU,
                'erro_detalhe' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

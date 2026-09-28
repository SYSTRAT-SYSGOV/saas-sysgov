<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Support\PorTenant;

/** RF-22 — 1º/jan 01:00 (+ disparo manual); idempotente por concessão/exercício. */
final class GerarGuiasAnuais extends Command
{
    protected $signature = 'cemiterios:gerar-guias-anuais {--exercicio= : Ano do exercício (padrão: ano corrente)}';

    protected $description = 'Gera as guias da taxa anual das concessões vigentes';

    public function handle(): int
    {
        $exercicio = (int) ($this->option('exercicio') ?: now()->year);
        $falhou = false;

        PorTenant::executar(function ($t) use ($exercicio, &$falhou): void {
            $r = app(GuiaService::class)->loteAnual($exercicio);
            $this->line("{$t->slug}: {$r['geradas']} gerada(s), {$r['existentes']} já existente(s), " . count($r['falhas']) . ' falha(s)');
            foreach ($r['falhas'] as $f) {
                $this->warn("  concessão {$f['concessao']}: {$f['erro']}");
            }
            $falhou = $falhou || $r['falhas'] !== [];
        });

        return $falhou ? self::FAILURE : self::SUCCESS;
    }
}

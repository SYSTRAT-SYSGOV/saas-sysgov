<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Services\ConcessaoService;
use Modules\Cemiterios\Support\PorTenant;

/** RF-12 — diário 07:00; um aviso por ciclo de término. */
final class NotificarVencimentos extends Command
{
    protected $signature = 'cemiterios:notificar-vencimentos';

    protected $description = 'Avisa os concessionários sobre concessões próximas do término';

    public function handle(): int
    {
        PorTenant::executar(fn ($t) => $this->line("{$t->slug}: " . app(ConcessaoService::class)->notificarVencimentos() . ' aviso(s)'));

        return self::SUCCESS;
    }
}

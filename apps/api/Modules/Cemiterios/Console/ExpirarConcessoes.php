<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Services\ConcessaoService;
use Modules\Cemiterios\Support\PorTenant;

/** RF-14 — diário 00:30; idempotente. */
final class ExpirarConcessoes extends Command
{
    protected $signature = 'cemiterios:expirar-concessoes';

    protected $description = 'Expira concessões temporárias vencidas e sinaliza pendência de regularização';

    public function handle(): int
    {
        PorTenant::executar(fn ($t) => $this->line("{$t->slug}: " . app(ConcessaoService::class)->expirarVencidas() . ' concessão(ões) expirada(s)'));

        return self::SUCCESS;
    }
}

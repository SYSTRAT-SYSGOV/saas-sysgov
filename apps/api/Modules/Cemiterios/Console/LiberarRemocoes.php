<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Services\AbandonoService;
use Modules\Cemiterios\Support\PorTenant;

/** RF-36 — diário 01:30: remoções pendentes de jazigos revertidos cujo prazo legal venceu. */
final class LiberarRemocoes extends Command
{
    protected $signature = 'cemiterios:liberar-remocoes';

    protected $description = 'Emite a remoção dos restos de jazigos revertidos quando o prazo legal de exumação vence';

    public function handle(): int
    {
        PorTenant::executar(fn ($t) => $this->line("{$t->slug}: " . app(AbandonoService::class)->liberarRemocoes() . ' remoção(ões) emitida(s)'));

        return self::SUCCESS;
    }
}

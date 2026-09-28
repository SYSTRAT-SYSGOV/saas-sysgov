<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Services\EmpreiteiroService;
use Modules\Cemiterios\Support\PorTenant;

/** RF-29/RF-32 — diário 00:45: alvarás anuais vencidos, fim de suspensões e obras vencidas. */
final class AtualizarAptidao extends Command
{
    protected $signature = 'cemiterios:atualizar-aptidao';

    protected $description = 'Recalcula a aptidão dos empreiteiros e sinaliza obras vencidas';

    public function handle(): int
    {
        PorTenant::executar(fn ($t) => $this->line("{$t->slug}: " . app(EmpreiteiroService::class)->rotinaDiaria() . ' empreiteiro(s) com situação alterada'));

        return self::SUCCESS;
    }
}

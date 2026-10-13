<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Console;

use Illuminate\Console\Command;
use Modules\MeioAmbiente\Services\RecursosHidricosService;

final class VerificarPrazosRecursosHidricosCommand extends Command
{
    protected $signature = 'meio-ambiente:verificar-prazos-recursos-hidricos';
    protected $description = 'Gera alertas de vencimento (90/30/7 dias) para outorgas de água e licenças de lançamento de efluentes, de todos os tenants';

    public function handle(RecursosHidricosService $recursosHidricos): int
    {
        $gerados = $recursosHidricos->verificarPrazos();

        $this->info("{$gerados} alertas de vencimento de recursos hídricos gerados.");

        return self::SUCCESS;
    }
}

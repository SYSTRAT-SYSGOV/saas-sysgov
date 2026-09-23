<?php

declare(strict_types=1);

namespace Modules\Capd\Console;

use Illuminate\Console\Command;
use Modules\Capd\Services\CicloService;
use Modules\Capd\Support\PorTenant;

/**
 * Gatilho de mudança de etapa (spec: automation › Gatilho de Mudança de
 * Etapa): avança automaticamente os ciclos abertos cuja data limite de
 * etapa já passou, independentemente de submissões pendentes.
 */
final class TransicionarEtapaCiclo extends Command
{
    protected $signature = 'capd:transicionar-etapa-ciclo';

    protected $description = 'Avança automaticamente ciclos abertos cuja data limite de etapa já passou';

    public function handle(CicloService $ciclos): int
    {
        PorTenant::executar(fn () => $ciclos->verificarETransicionarEtapaAutomaticamente());

        return self::SUCCESS;
    }
}

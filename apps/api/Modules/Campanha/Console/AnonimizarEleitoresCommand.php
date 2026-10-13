<?php

declare(strict_types=1);

namespace Modules\Campanha\Console;

use Illuminate\Console\Command;
use Modules\Campanha\Services\EleitorService;

/** Anonimiza os eleitores das campanhas encerradas cujo prazo de retenção venceu (D5). Agendado diariamente. */
final class AnonimizarEleitoresCommand extends Command
{
    protected $signature = 'campanha:anonimizar-eleitores';

    protected $description = 'Anonimiza os eleitores das campanhas encerradas após o prazo de retenção (LGPD)';

    public function handle(EleitorService $eleitores): int
    {
        $resultado = $eleitores->anonimizarVencidas();
        foreach ($resultado as $campanha => $quantidade) {
            $this->line("Campanha #{$campanha}: {$quantidade} eleitor(es) anonimizado(s).");
        }
        $this->info($resultado === [] ? 'Nenhuma campanha com prazo vencido.' : 'Anonimização concluída.');

        return self::SUCCESS;
    }
}

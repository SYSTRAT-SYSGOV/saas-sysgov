<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Console;

use Illuminate\Console\Command;
use Modules\MeioAmbiente\Services\ProcessoLicenciamentoService;

final class VerificarPrazosLicenciamentoCommand extends Command
{
    protected $signature = 'meio-ambiente:verificar-prazos-licenciamento';
    protected $description = 'Gera alertas de vencimento (90/30/7 dias) para licenças ambientais deferidas, de todos os tenants';

    public function handle(ProcessoLicenciamentoService $licenciamento): int
    {
        $gerados = $licenciamento->verificarPrazos();

        $this->info("{$gerados} alertas de vencimento de licenciamento gerados.");

        return self::SUCCESS;
    }
}

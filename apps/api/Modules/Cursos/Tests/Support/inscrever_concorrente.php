<?php

declare(strict_types=1);

/*
 * Processo disputante do teste de concorrência de vagas (ConcorrenciaVagasMysqlTest).
 * Uso: php inscrever_concorrente.php <tenantId> <turmaId> <userId> <largadaEmMicrossegundos>
 *
 * Só roda contra o banco descartável do teste — nunca contra o banco real.
 */

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\InscricaoService;

const BANCO_DO_TESTE = 'sysgov_cursos_concorrencia_teste';

if (getenv('DB_DATABASE') !== BANCO_DO_TESTE || getenv('DB_CONNECTION') !== 'mysql') {
    fwrite(STDERR, 'Recusado: este script só roda contra o banco ' . BANCO_DO_TESTE . PHP_EOL);
    exit(2);
}

[$_, $tenantId, $turmaId, $userId, $largada] = $argv;

require __DIR__ . '/../../../../vendor/autoload.php';
$app = require __DIR__ . '/../../../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

app(TenantContext::class)->set(Tenant::findOrFail((int) $tenantId));
$user = User::findOrFail((int) $userId);
$turma = Turma::findOrFail((int) $turmaId);
$servico = app(InscricaoService::class);
$participante = $servico->participanteDoUsuario($user);

// Todos os processos largam no mesmo instante, depois do boot.
$espera = (int) $largada - (int) (microtime(true) * 1_000_000);
if ($espera > 0) {
    usleep($espera);
}

$inscricao = $servico->inscrever($turma, $participante, $user);
echo $inscricao->status;

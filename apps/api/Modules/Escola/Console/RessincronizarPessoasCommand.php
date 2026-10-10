<?php

declare(strict_types=1);

namespace Modules\Escola\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Services\AlunoPessoaService;

/**
 * Recopia nome, nascimento, mãe e pai das pessoas para os alunos ligados (D5). O evento
 * PessoaAtualizada mantém as cópias em dia; este comando corrige divergências antigas.
 */
final class RessincronizarPessoasCommand extends Command
{
    protected $signature = 'escola:ressincronizar-pessoas {--tenant= : Só este tenant (id)}';

    protected $description = 'Atualiza nos alunos os dados civis das pessoas ligadas do Cadastro de Pessoas';

    public function handle(AlunoPessoaService $alunos): int
    {
        $pares = DB::table('escola_alunos')
            ->whereNotNull('pessoa_id')
            ->whereNull('deleted_at')
            ->when($this->option('tenant'), fn ($q, $t) => $q->where('tenant_id', (int) $t))
            ->distinct()
            ->get(['tenant_id', 'pessoa_id']);

        foreach ($pares as $par) {
            $alunos->atualizarCopias((int) $par->pessoa_id, (int) $par->tenant_id);
        }

        $this->info("Pessoas ressincronizadas: {$pares->count()}.");

        return self::SUCCESS;
    }
}

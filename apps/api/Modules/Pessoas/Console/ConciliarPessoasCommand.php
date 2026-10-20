<?php

declare(strict_types=1);

namespace Modules\Pessoas\Console;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Console\Command;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;

/**
 * Concilia as cópias de dado civil de um módulo com o cadastro central de pessoas.
 * Sempre rode antes com --dry-run: o relatório é o que a execução real faria, sem gravar nada.
 */
final class ConciliarPessoasCommand extends Command
{
    protected $signature = 'pessoas:conciliar {modulo : Alias do módulo (ex.: escola)} {--tenant= : Só este tenant (slug)} {--dry-run : Mostra o relatório sem gravar}';

    protected $description = 'Concilia os dados civis duplicados de um módulo com o cadastro central de pessoas';

    public function handle(ConciliacaoRegistry $registry, ConciliacaoPessoaService $servico, TenantContext $contexto): int
    {
        $alias = (string) $this->argument('modulo');
        if (! in_array($alias, $registry->aliases(), true)) {
            $this->error("Módulo sem conciliação registrada: {$alias}. Disponíveis: " . (implode(', ', $registry->aliases()) ?: 'nenhum') . '.');

            return self::FAILURE;
        }

        $modulo = $registry->obter($alias);
        $dryRun = (bool) $this->option('dry-run');
        $tenants = Tenant::query()->when($this->option('tenant'), fn ($q, $slug) => $q->where('slug', $slug))->get();
        if ($tenants->isEmpty()) {
            $this->error('Nenhum tenant encontrado.');

            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $contexto->set($tenant);
            try {
                $r = $servico->conciliar($modulo, $dryRun);
            } finally {
                $contexto->clear();
            }

            $this->line(($dryRun ? '[DRY-RUN] ' : '') . "Tenant {$tenant->slug} — módulo {$alias}");
            $this->table(['Item', 'Total'], [
                ['Registros processados', $r['processados']],
                ['Já vinculados', $r['ja_vinculados']],
                ['Vinculados por documento', $r['vinculados_por_documento']],
                ['Pessoas criadas com documento pendente', $r['criadas_pendentes']],
                ['Campos completados no cadastro central', $r['campos_completados']],
                ['Divergências registradas', $r['divergencias_registradas']],
                ['Possíveis duplicidades (precisam de confirmação)', count($r['possiveis_duplicidades'])],
                ['Menores sem responsável (não vinculados)', count($r['sem_responsavel'])],
                ['Erros', count($r['erros'])],
            ]);
        }

        return self::SUCCESS;
    }
}

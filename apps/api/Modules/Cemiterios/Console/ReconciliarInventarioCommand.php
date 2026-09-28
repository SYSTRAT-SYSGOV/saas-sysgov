<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\GisService;

/**
 * Comando Artisan para reconciliação cadastral e saneamento do acervo de jazigos.
 * Sincroniza a ocupação real, recalcula estados operacionais e trata registros sentinelas.
 */
final class ReconciliarInventarioCommand extends Command
{
    protected $signature = 'cemiterios:reconciliar-inventario
        {--tenant= : Slug ou ID do Tenant (opcional, padrão: todos)}
        {--necropole=all : ID ou código do Cemitério/Parque}
        {--limpar-sentinelas : Efetua soft-delete em jazigos sentinelas órfãos (ex: Q0000-L0000)}
        {--dry-run : Simulação sem gravar no banco de dados}';

    protected $description = 'Reconcilia ocupação e estados dos jazigos com base nas inumações e concessões vigentes reais';

    public function handle(): int
    {
        if (class_exists(\Laravel\Telescope\Telescope::class)) {
            \Laravel\Telescope\Telescope::stopRecording();
        }
        DB::connection()->disableQueryLog();

        $tenantOpt = $this->option('tenant');
        $dryRun = (bool) $this->option('dry-run');
        $limparSentinelas = (bool) $this->option('limpar-sentinelas');
        $necropoleOpt = (string) $this->option('necropole');

        $this->info('===============================================================');
        $this->info('  RECONCILIAÇÃO E SANEAMENTO DO INVENTÁRIO DE CEMITÉRIOS');
        $this->info('===============================================================');
        $this->line('Modo: ' . ($dryRun ? '<fg=yellow>SIMULAÇÃO (DRY-RUN)</>' : '<fg=green>EXECUÇÃO DEFINITIVA</>'));
        $this->line('Limpar sentinelas: ' . ($limparSentinelas ? 'SIM' : 'NÃO'));
        $this->newLine();

        $query = Tenant::query();
        if ($tenantOpt) {
            $query->where(fn ($q) => $q->where('slug', $tenantOpt)->orWhere('id', $tenantOpt));
        }

        $tenants = $query->get();
        if ($tenants->isEmpty()) {
            $this->error('Nenhum tenant encontrado.');
            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $this->processarTenant($tenant, $necropoleOpt, $limparSentinelas, $dryRun);
        }

        $this->info('Reconciliação concluída com sucesso!');
        return self::SUCCESS;
    }

    private function processarTenant(Tenant $tenant, string $necropoleOpt, bool $limparSentinelas, bool $dryRun): void
    {
        app(TenantContext::class)->set($tenant);
        $this->line("<comment>Tenant: {$tenant->name} ({$tenant->slug})</comment>");

        $parquesQuery = Cemiterio::query();
        if ($necropoleOpt !== 'all') {
            $parquesQuery->where(fn ($q) => $q->where('id', $necropoleOpt)->orWhere('codigo', $necropoleOpt));
        }
        $parques = $parquesQuery->get();

        if ($parques->isEmpty()) {
            $this->line('  Nenhum cemitério encontrado para os parâmetros informados.');
            return;
        }

        foreach ($parques as $parque) {
            $this->line("  Processando necrópole: <info>{$parque->nome} (#{$parque->codigo})</info>");

            // 1. Identificar registros sentinelas (como Q0000-L0000 ou quadras '0000')
            $sentinelas = Jazigo::query()
                ->where('park_id', $parque->id)
                ->where(function ($q) {
                    $q->where('codigo', 'like', 'Q0000-L0000%')
                      ->orWhere('codigo', 'like', '%0000-0000%')
                      ->orWhereHas('setor', fn ($sq) => $sq->where('codigo', '0000'));
                })
                ->get();

            $totalSentinelas = $sentinelas->count();
            if ($totalSentinelas > 0) {
                $this->line("    Encontrado(s) <comment>{$totalSentinelas}</comment> registro(s) sentinela(s).");
                foreach ($sentinelas as $s) {
                    $temInumacoes = Inumacao::where('plot_id', $s->id)->exists();
                    $temConcessao = Concessao::where('plot_id', $s->id)->exists();
                    if (!$temInumacoes && !$temConcessao) {
                        $this->line("      - Jazigo órfão #{$s->id} ({$s->codigo}): sem sepultados ou concessões.");
                        if (!$dryRun && $limparSentinelas) {
                            $s->delete();
                            $this->line("        <fg=red>[REMOVIDO / SOFT DELETED]</>");
                        }
                    } else {
                        $this->line("      - Jazigo #{$s->id} ({$s->codigo}): possui dados vinculados, preservado.");
                    }
                }
            }

            // 2. Apuração comparativa de divergências de ocupação e estado
            $driver = DB::connection()->getDriverName();
            $totalJazigos = Jazigo::where('park_id', $parque->id)->count();

            if ($driver === 'mysql') {
                // Contabiliza divergências antes da atualização
                $divergencias = DB::select("
                    SELECT 
                        COUNT(CASE WHEN p.ocupacao != COALESCE(b.total, 0) THEN 1 END) as ocupacoes_divergentes,
                        COUNT(CASE WHEN p.estado != (
                            CASE 
                                WHEN p.estado = 'manutencao' THEN 'manutencao'
                                WHEN COALESCE(b.total, 0) >= p.capacidade THEN 'capacidade_maxima'
                                WHEN COALESCE(b.total, 0) > 0 THEN 'ocupado'
                                WHEN EXISTS (SELECT 1 FROM concessions c WHERE c.plot_id = p.id AND c.estado IN ('Ativa','Vencendo','Sucedida','Transferida') AND c.deleted_at IS NULL) THEN 'concedido'
                                ELSE 'disponivel'
                            END
                        ) THEN 1 END) as estados_divergentes
                    FROM plot_inventory p
                    LEFT JOIN (
                        SELECT plot_id, COUNT(*) as total 
                        FROM cemetery_burials 
                        WHERE situacao = 'confirmada' AND deleted_at IS NULL
                        GROUP BY plot_id
                    ) b ON b.plot_id = p.id
                    WHERE p.park_id = ? AND p.deleted_at IS NULL
                ", [$parque->id])[0] ?? null;

                $ocupDivergentes = $divergencias->ocupacoes_divergentes ?? 0;
                $estDivergentes = $divergencias->estados_divergentes ?? 0;

                $this->line("    Total de jazigos analisados: <info>{$totalJazigos}</info>");
                $this->line("    Ocupações divergentes identificadas: <comment>{$ocupDivergentes}</comment>");
                $this->line("    Estados divergentes identificados: <comment>{$estDivergentes}</comment>");

                if (!$dryRun && ($ocupDivergentes > 0 || $estDivergentes > 0)) {
                    DB::statement("
                        UPDATE plot_inventory p
                        LEFT JOIN (
                            SELECT plot_id, COUNT(*) as total 
                            FROM cemetery_burials 
                            WHERE situacao = 'confirmada' AND deleted_at IS NULL
                            GROUP BY plot_id
                        ) b ON b.plot_id = p.id
                        SET p.ocupacao = COALESCE(b.total, 0),
                            p.estado = CASE 
                                WHEN p.estado = 'manutencao' THEN 'manutencao'
                                WHEN COALESCE(b.total, 0) >= p.capacidade THEN 'capacidade_maxima'
                                WHEN COALESCE(b.total, 0) > 0 THEN 'ocupado'
                                WHEN EXISTS (SELECT 1 FROM concessions c WHERE c.plot_id = p.id AND c.estado IN ('Ativa','Vencendo','Sucedida','Transferida') AND c.deleted_at IS NULL) THEN 'concedido'
                                ELSE 'disponivel'
                            END,
                            p.updated_at = NOW()
                        WHERE p.park_id = ? AND p.deleted_at IS NULL
                    ", [$parque->id]);

                    $this->line("    <fg=green>[SINCRONIZADO VIA SQL NO BANCO DE DADOS]</>");
                }
            } else {
                $this->line("    Total de jazigos analisados: <info>{$totalJazigos}</info>");
            }

            if (!$dryRun) {
                GisService::invalidar((int) $tenant->id);
            }
        }
    }
}

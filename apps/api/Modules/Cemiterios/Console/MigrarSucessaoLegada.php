<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\ProcessoSucessao;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoHerdeiro;
use Modules\Cemiterios\Models\SucessaoHistorico;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\PorTenant;

/** Migração idempotente de dados legados (cemetery_succession_processes + cemetery_succession_heirs) para novas tabelas (sucessoes + sucessao_herdeiros). */
final class MigrarSucessaoLegada extends Command
{
    protected $signature = 'cemiterio:migrate-sucessao-legacy {--tenant= : Slug do tenant específico (opcional)} {--dry-run : Simula sem persistir}';

    protected $description = 'Migra processos de sucessão legados para as novas tabelas (idempotente)';

    public function handle(): int
    {
        $tenantSlug = $this->option('tenant');
        $dryRun = $this->option('dry-run');

        $query = ProcessoSucessao::query();

        if ($tenantSlug) {
            $tenant = \App\Models\Tenant::where('slug', $tenantSlug)->firstOrFail();
            $query->where('tenant_id', $tenant->id);
        }

        $processosLegados = $query->with(['herdeiros', 'concessao'])->get();
        $total = $processosLegados->count();
        $migrados = 0;
        $pulados = 0;

        $this->info("Encontrados {$total} processos legados para migrar.");

        foreach ($processosLegados as $legado) {
            // Verifica se já foi migrado
            $jaMigrado = Sucessao::where('concession_id', $legado->concession_id)
                ->where('tenant_id', $legado->tenant_id)
                ->where('processo_referencia', $legado->numero_processo)
                ->exists();

            if ($jaMigrado) {
                $pulados++;
                continue;
            }

            $this->line("Migrando processo {$legado->id} ({$legado->numero_processo})...");

            if (!$dryRun) {
                DB::transaction(function () use ($legado): void {
                    // Mapeia situação legada para novo estado
                    $estadoMap = [
                        'em_analise' => EstadoSucessao::EmAnalise,
                        'deferido' => EstadoSucessao::Sucedida,
                        'indeferido' => EstadoSucessao::Indeferida,
                        'cancelado' => EstadoSucessao::Arquivada,
                    ];

                    $estado = $estadoMap[$legado->situacao] ?? EstadoSucessao::EmAnalise;

                    // Mapeia tipo_documento legada para nova via
                    $viaMap = [
                        'inventario_judicial' => ViaSucessao::InventarioJudicial,
                        'inventario_extrajudicial' => ViaSucessao::InventarioExtrajudicial,
                        'alvara_judicial' => ViaSucessao::AlvaráJudicial,
                        'outro' => ViaSucessao::Arrolamento,
                    ];

                    $via = $viaMap[$legado->tipo_documento] ?? ViaSucessao::InventarioJudicial;

                    // Cria o novo processo sucessório
                    $sucessao = Sucessao::create([
                        'tenant_id' => $legado->tenant_id,
                        'concession_id' => $legado->concession_id,
                        'park_id' => $legado->concessao?->plot_id ? $legado->concessao->jazigo?->park_id : null,
                        'plot_id' => $legado->concessao?->plot_id,
                        'via' => $via,
                        'estado' => $estado,
                        'requerente_id' => null,
                        'titular_falecido_id' => $legado->concessao?->holder_id,
                        'data_falecimento' => null, // Não temos essa info no legado
                        'processo_referencia' => $legado->numero_processo,
                        'parecer' => $legado->despacho_fundamentacao,
                        'lock_version' => 1,
                    ]);

                    // Migra herdeiros
                    foreach ($legado->herdeiros as $index => $herdeiro) {
                        SucessaoHerdeiro::create([
                            'tenant_id' => $legado->tenant_id,
                            'sucessao_id' => $sucessao->getKey(),
                            'nome' => $herdeiro->nome,
                            'parentesco' => Parentesco::tryFrom($herdeiro->parentesco) ?? Parentesco::Outro,
                            'documento' => $herdeiro->documento,
                            'ordem' => $index + 1,
                            'direito_representacao' => false,
                            'titular_indicado' => $herdeiro->titular_indicado ?? false,
                            'herdeiro_representado_id' => null,
                        ]);
                    }

                    // Cria histórico inicial
                    SucessaoHistorico::create([
                        'tenant_id' => $sucessao->tenant_id,
                        'sucessao_id' => $sucessao->getKey(),
                        'de_estado' => '',
                        'para_estado' => $estado->value,
                        'motivo' => ['parecer' => 'Migração de dados legados', 'created_at' => now()->toIso8601String()],
                        'usuario_id' => null,
                    ]);
                });
            }

            $migrados++;
        }

        $this->info("Migração concluída. Migrados: {$migrados}, Pulados (já existentes): {$pulados}");

        return self::SUCCESS;
    }
}
<?php

declare(strict_types=1);

namespace Modules\Campanha\Console;

use Illuminate\Console\Command;
use Modules\Campanha\Services\Referencia\ImportacaoReferenciaService;

/** Carrega/atualiza a base pública (IBGE + TSE) de uma UF — D4. */
final class ImportarReferenciaCommand extends Command
{
    protected $signature = 'campanha:importar-referencia {uf : Sigla da UF (ex.: PR)} {--eleicao=2024 : Ano da eleição municipal dos eleitos} {--eleitorado= : Ano do eleitorado do TSE (padrão: o mais recente)}';

    protected $description = 'Importa municípios, população e malha (IBGE) e eleitorado e eleitos (TSE) de uma UF para o módulo Campanha';

    public function handle(ImportacaoReferenciaService $importacao): int
    {
        $eleitorado = $this->option('eleitorado');
        $registro = $importacao->importar(
            (string) $this->argument('uf'),
            (int) $this->option('eleicao'),
            $eleitorado !== null && $eleitorado !== '' ? (int) $eleitorado : null,
            fn (string $etapa) => $this->line("  {$etapa}"),
        );

        foreach ($registro->resumo ?? [] as $etapa => $r) {
            $r['ok']
                ? $this->info("✓ {$etapa}: " . json_encode($r['resultado'], JSON_UNESCAPED_UNICODE))
                : $this->error("✗ {$etapa}: {$r['erro']}");
        }
        $this->line("Importação #{$registro->id}: {$registro->situacao}");

        return $registro->situacao === 'concluida' ? self::SUCCESS : self::FAILURE;
    }
}

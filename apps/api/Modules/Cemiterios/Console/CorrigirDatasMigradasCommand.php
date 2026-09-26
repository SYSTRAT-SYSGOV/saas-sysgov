<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;

/**
 * Comando para auditar, sanear e corrigir o cruzamento de datas históricas
 * de inumações e falecidos migrados do sistema Clipper.
 */
final class CorrigirDatasMigradasCommand extends Command
{
    protected $signature = 'cemiterios:corrigir-datas-migradas
        {--path= : Diretório dos CSVs exportados (padrão: D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data)}
        {--dry-run : Apenas simular sem persistir no banco}';

    protected $description = 'Corrige o cruzamento de datas de sepultamento e falecimento das inumações migradas do legado';

    private const CAMINHO_PADRAO = 'D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data';

    public function handle(): int
    {
        $basePath = (string) ($this->option('path') ?: self::CAMINHO_PADRAO);
        $dryRun = (bool) $this->option('dry-run');

        $this->info("===============================================================");
        $this->info("  SANEAMENTO E CORREÇÃO DE DATAS DO LEGADO (CLIPPER -> SYSGOV)");
        $this->info("===============================================================");
        $this->line("Origem: " . $basePath);
        $this->line("Modo:   " . ($dryRun ? '<fg=yellow>SIMULAÇÃO (DRY-RUN)</>' : '<fg=green>EXECUÇÃO DEFINITIVA</>'));
        $this->newLine();

        // 1. Limpeza de Duplicatas de Inumações e Falecidos Órfãos
        $this->info("1. Verificando e saneando inumações duplicadas acumuladas...");
        $duplicatasRemovidas = 0;

        if (!$dryRun) {
            // Identificar inumações duplicadas no mesmo jazigo para a mesma pessoa
            $duplicatas = DB::table('cemetery_burials as b')
                ->join('deceased_records as d', 'b.deceased_id', '=', 'd.id')
                ->select('b.tenant_id', 'b.plot_id', 'd.nome', DB::raw('count(*) as total_ocorrencias'), DB::raw('MIN(b.id) as keep_id'))
                ->groupBy('b.tenant_id', 'b.plot_id', 'd.nome')
                ->having('total_ocorrencias', '>', 1)
                ->get();

            if ($duplicatas->isNotEmpty()) {
                $totalGrupos = count($duplicatas);
                $this->warn("Encontrados {$totalGrupos} grupos com inumações duplicadas. Removendo clones excedentes...");

                foreach ($duplicatas as $grupo) {
                    // Buscar todos os IDs excedentes deste grupo
                    $excedentes = DB::table('cemetery_burials as b')
                        ->join('deceased_records as d', 'b.deceased_id', '=', 'd.id')
                        ->where('b.tenant_id', $grupo->tenant_id)
                        ->where('b.plot_id', $grupo->plot_id)
                        ->where('d.nome', $grupo->nome)
                        ->where('b.id', '!=', $grupo->keep_id)
                        ->select('b.id as inumacao_id', 'b.deceased_id')
                        ->get();

                    if ($excedentes->isNotEmpty()) {
                        $inumacaoIds = $excedentes->pluck('inumacao_id')->toArray();
                        $deceasedIds = $excedentes->pluck('deceased_id')->toArray();

                        DB::table('cemetery_burials')->whereIn('id', $inumacaoIds)->delete();
                        DB::table('deceased_records')->whereIn('id', $deceasedIds)->delete();

                        $duplicatasRemovidas += count($inumacaoIds);
                    }
                }

                $this->info("Total de {$duplicatasRemovidas} inumações duplicadas e falecidos órfãos removidos com sucesso.");
            } else {
                $this->info("Nenhuma inumação duplicada encontrada.");
            }
        }

        // 2. Processar e reconciliar datas a partir dos CSVs
        $necropoles = [
            '01' => [
                'nome' => 'Cemitério Central',
                'pasta' => rtrim($basePath, '/\\') . '/Cemiterio Central',
            ],
            '02' => [
                'nome' => 'Cemitério Independência',
                'pasta' => rtrim($basePath, '/\\') . '/Cemiterio Independencia',
            ],
        ];

        $totalAtualizados = 0;
        $totalOriginais = 0;
        $totalEstimadosLote = 0;
        $totalMarcoHistorico = 0;

        foreach ($necropoles as $cod => $info) {
            $caminho = $info['pasta'];
            $dadosCsv = "{$caminho}/DADOS.csv";
            $lotesCsv = "{$caminho}/LOTES.csv";

            if (!file_exists($dadosCsv) || !file_exists($lotesCsv)) {
                $this->warn("Arquivos não encontrados para {$info['nome']}");
                continue;
            }

            $this->info("\nProcessando {$info['nome']} (Código {$cod})...");

            // Carregar mapa de lotes
            $mapaLotes = [];
            $fLotes = fopen($lotesCsv, 'r');
            $headerLotes = fgetcsv($fLotes);
            while (($r = fgetcsv($fLotes)) !== false) {
                if (count($r) < 7) continue;
                $q = trim($r[1]);
                $l = trim($r[2]);
                $mapaLotes["{$q}_{$l}"] = [
                    'tipo' => trim($r[3]),
                    'processo' => trim($r[5]),
                    'validade' => trim($r[6]),
                ];
            }
            fclose($fLotes);

            // Buscar cemitérios correspondentes no banco (suporte multi-tenant)
            $cemiterios = Cemiterio::where('codigo', "CEM-{$cod}")->get();
            if ($cemiterios->isEmpty()) {
                $this->warn("Nenhum cemitério CEM-{$cod} cadastrado no banco.");
                continue;
            }

            // Ler DADOS.csv e reconciliar
            $fDados = fopen($dadosCsv, 'r');
            $headerDados = fgetcsv($fDados);

            $linhas = [];
            while (($r = fgetcsv($fDados)) !== false) {
                if (count($r) < 9) continue;
                $quadra = trim($r[1]);
                $lote = trim($r[2]);
                $item = trim($r[3]);
                $nome = trim($r[4]);
                $dtNasc = $this->parseData($r[5] ?? null);
                $dtFal = $this->parseData($r[6] ?? null);
                $certidao = trim($r[7] ?? '');
                $dtEmi = $this->parseData($r[8] ?? null);
                $cartorio = trim($r[9] ?? '');

                if ($nome === '') continue;

                $linhas[] = compact('quadra', 'lote', 'item', 'nome', 'dtNasc', 'dtFal', 'certidao', 'dtEmi', 'cartorio');
            }
            fclose($fDados);

            foreach ($cemiterios as $cemiterio) {
                $this->line("Reconciliando " . count($linhas) . " registros para o cemitério ID {$cemiterio->id} (Tenant {$cemiterio->tenant_id})...");

                // Pré-carregar jazigos do cemitério em memória
                $jazigosMap = DB::table('plot_inventory')
                    ->where('park_id', $cemiterio->id)
                    ->pluck('id', 'codigo')
                    ->toArray();

                if (empty($jazigosMap)) {
                    $this->warn("Nenhum jazigo encontrado para o cemitério ID {$cemiterio->id}.");
                    continue;
                }

                // Pré-carregar inumações e falecidos existentes deste cemitério
                $burialsList = DB::table('cemetery_burials as b')
                    ->join('deceased_records as d', 'b.deceased_id', '=', 'd.id')
                    ->where('b.tenant_id', $cemiterio->tenant_id)
                    ->whereIn('b.plot_id', array_values($jazigosMap))
                    ->select('b.id as burial_id', 'b.plot_id', 'b.deceased_id', 'd.nome', 'd.nascimento')
                    ->get();

                $burialsMap = [];
                foreach ($burialsList as $bItem) {
                    $chave = $bItem->plot_id . '_' . Falecido::normalizar((string) $bItem->nome);
                    $burialsMap[$chave] = $bItem;
                }

                $bar = $this->output->createProgressBar(count($linhas));
                $bar->start();

                foreach (array_chunk($linhas, 500) as $chunk) {
                    if (!$dryRun) {
                        DB::transaction(function () use (
                            $chunk,
                            $jazigosMap,
                            $burialsMap,
                            $mapaLotes,
                            $cod,
                            &$totalAtualizados,
                            &$totalOriginais,
                            &$totalEstimadosLote,
                            &$totalMarcoHistorico
                        ): void {
                            foreach ($chunk as $d) {
                                $quadra = $d['quadra'];
                                $lote = $d['lote'];
                                $nome = $d['nome'];
                                $dtNasc = $d['dtNasc'];
                                $dtFal = $d['dtFal'];
                                $dtEmi = $d['dtEmi'];
                                $certidao = $d['certidao'];
                                $cartorio = $d['cartorio'];

                                $codigoJazigo = "Q{$quadra}-L{$lote}";
                                $plotId = $jazigosMap[$codigoJazigo] ?? null;
                                if (!$plotId) continue;

                                $chave = $plotId . '_' . Falecido::normalizar((string) $nome);
                                $burial = $burialsMap[$chave] ?? null;
                                if (!$burial) continue;

                                // Determinar datas corretas
                                $dataFalecimento = null;
                                $dataSepultamento = null;
                                $revisaoPendente = false;
                                $livroRef = "Legado Clipper Cem. {$cod}";

                                if ($dtFal && $dtEmi) {
                                    $dataFalecimento = $dtFal;
                                    $dataSepultamento = $dtEmi;
                                    $totalOriginais++;
                                } elseif ($dtFal) {
                                    $dataFalecimento = $dtFal;
                                    $dataSepultamento = $dtFal;
                                    $totalOriginais++;
                                } elseif ($dtEmi) {
                                    $dataFalecimento = $dtEmi;
                                    $dataSepultamento = $dtEmi;
                                    $totalOriginais++;
                                } else {
                                    // Ambas ausentes no Clipper
                                    $revisaoPendente = true;
                                    $loteInfo = $mapaLotes["{$quadra}_{$lote}"] ?? null;
                                    $valLote = $loteInfo['validade'] ?? null;

                                    if ($valLote && $valLote !== '0000-00-00' && $valLote !== '1911-11-11') {
                                        try {
                                            $dtVal = Carbon::parse($valLote);
                                            $dtEstimada = $dtVal->year >= 1975
                                                ? $dtVal->subYears(5)->toDateString()
                                                : '1995-01-01';
                                            $dataFalecimento = $dtEstimada;
                                            $dataSepultamento = $dtEstimada;
                                            $livroRef .= " (Data estimada pela validade do lote - pendente conferência)";
                                            $totalEstimadosLote++;
                                        } catch (\Throwable) {
                                            $dataFalecimento = '1995-01-01';
                                            $dataSepultamento = '1995-01-01';
                                            $livroRef .= " (Sem data original - marco 1995 - pendente conferência)";
                                            $totalMarcoHistorico++;
                                        }
                                    } else {
                                        $dataFalecimento = '1995-01-01';
                                        $dataSepultamento = '1995-01-01';
                                        $livroRef .= " (Sem data original - marco 1995 - pendente conferência)";
                                        $totalMarcoHistorico++;
                                    }
                                }

                                // Atualizar dados da inumação
                                DB::table('cemetery_burials')->where('id', $burial->burial_id)->update([
                                    'sepultado_em' => "{$dataSepultamento} 10:00:00",
                                    'carencia_desde' => $dataSepultamento,
                                    'livro_referencia' => $livroRef,
                                    'revisao_pendente' => $revisaoPendente,
                                    'situacao' => 'confirmada',
                                    'updated_at' => now(),
                                ]);

                                // Atualizar falecido
                                $dtNascFinal = $dtNasc ?: $burial->nascimento;
                                $idadeObito = null;
                                if ($dtNascFinal && $dataFalecimento && Carbon::parse($dataFalecimento)->greaterThanOrEqualTo(Carbon::parse($dtNascFinal))) {
                                    $idadeObito = (int) Carbon::parse($dtNascFinal)->diffInYears(Carbon::parse($dataFalecimento));
                                }

                                $updateFalecido = [
                                    'falecimento' => $dataFalecimento,
                                    'idade_obito' => $idadeObito,
                                    'updated_at' => now(),
                                ];
                                if ($dtNasc) $updateFalecido['nascimento'] = $dtNasc;
                                if ($certidao && $certidao !== '1' && $certidao !== '111111') $updateFalecido['certidao_numero'] = $certidao;
                                if ($cartorio && !str_contains(strtoupper($cartorio), 'FALTA')) $updateFalecido['certidao_cartorio'] = $cartorio;

                                DB::table('deceased_records')->where('id', $burial->deceased_id)->update($updateFalecido);
                                $totalAtualizados++;
                            }
                        });
                    }
                    $bar->advance(count($chunk));
                }
                $bar->finish();
                $this->newLine();
            }
        }

        // 3. Recalcular ocupações físicas nos jazigos
        if (!$dryRun) {
            $this->info("\n3. Recalculando ocupação física dos jazigos...");
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
                        WHEN COALESCE(b.total, 0) >= p.capacidade THEN 'capacidade_maxima'
                        WHEN COALESCE(b.total, 0) > 0 THEN 'ocupado'
                        WHEN EXISTS (SELECT 1 FROM concessions c WHERE c.plot_id = p.id AND c.situacao = 'vigente' AND c.deleted_at IS NULL) THEN 'concedido'
                        ELSE 'disponivel'
                    END
            ");
            $this->info("Ocupações e estados de jazigos recalculados com sucesso!");
        }

        $this->newLine();
        $this->info("===============================================================");
        $this->info("  RESUMO DO SANEAMENTO");
        $this->info("===============================================================");
        $this->table(
            ['Métrica', 'Total'],
            [
                ['Inumações duplicadas eliminadas', number_format($duplicatasRemovidas, 0, ',', '.')],
                ['Inumações e Falecidos atualizados', number_format($totalAtualizados, 0, ',', '.')],
                ['Registros com data original (DT_FAL / DT_EMI)', number_format($totalOriginais, 0, ',', '.')],
                ['Registros com data estimada pela validade do lote', number_format($totalEstimadosLote, 0, ',', '.')],
                ['Registros com marco histórico 1995 (revisão pendente)', number_format($totalMarcoHistorico, 0, ',', '.')],
            ]
        );

        return self::SUCCESS;
    }

    private function parseData(?string $valor): ?string
    {
        if (!$valor) return null;
        $limpo = trim($valor);
        if ($limpo === '' || $limpo === '0000-00-00' || $limpo === '00/00/0000') {
            return null;
        }
        try {
            return Carbon::parse($limpo)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}

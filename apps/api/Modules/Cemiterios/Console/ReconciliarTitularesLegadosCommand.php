<?php

namespace Modules\Cemiterios\Console;

use App\Models\Tenant;
use Modules\Cemiterios\Support\Documento;
use App\Support\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Entities\CemiterioParque;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;

class ReconciliarTitularesLegadosCommand extends Command
{
    protected $signature = 'cemiterios:reconciliar-titulares-legados
                            {--tenant= : Slug ou ID do tenant (ex: araucaria-pr)}
                            {--dir= : Diretório raiz dos CSVs legados (opcional)}
                            {--dry-run : Apenas simular sem persistir alterações}';

    protected $description = 'Desfaz o colapso indevido de titulares sob CPF sentinela (11111111111) restaurando os titulares legítimos a partir do RESPONSA.csv';

    public function handle(): int
    {
        $tenantParam = $this->option('tenant') ?: 'araucaria-pr';
        $dryRun = (bool) $this->option('dry-run');

        $tenant = null;
        if (is_numeric($tenantParam)) {
            $tenant = Tenant::find((int) $tenantParam);
        }
        if (!$tenant && \Illuminate\Support\Facades\Schema::hasColumn('tenants', 'slug')) {
            $tenant = Tenant::where('slug', $tenantParam)->first();
        }
        if (!$tenant) {
            $tenant = Tenant::where('name', 'like', "%{$tenantParam}%")->first();
        }
        if (!$tenant && $tenantParam === 'araucaria-pr') {
            $tenant = Tenant::find(2) ?? Tenant::first();
        }

        if (!$tenant) {
            $this->error("Tenant '{$tenantParam}' não encontrado.");
            return self::FAILURE;
        }

        app(TenantContext::class)->set($tenant);

        $dirPadraoStorage = storage_path('exported_data');
        $dirWindows = 'D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data';
        $dirRaiz = $this->option('dir') ?: (is_dir($dirPadraoStorage) ? $dirPadraoStorage : $dirWindows);

        if (!is_dir($dirRaiz)) {
            $this->error("Diretório de origem não encontrado: {$dirRaiz}");
            return self::FAILURE;
        }

        $this->info("===============================================================");
        $this->info("  RECONCILIAÇÃO DE TITULARES LEGADOS (DESFAZER CPF SENTINELA) ");
        $this->info("===============================================================");
        $this->line("Tenant:   {$tenant->name} (ID: {$tenant->id})");
        $this->line("Origem:   {$dirRaiz}");
        $this->line("Modo:     " . ($dryRun ? 'SIMULAÇÃO (dry-run)' : 'EXECUÇÃO DEFINITIVA'));
        $this->newLine();

        $cemiterios = [
            'CEM-01' => [
                'dir' => $dirRaiz . '/Cemiterio Central',
                'codNecropole' => '01',
                'nome' => 'Cemitério Central',
            ],
            '01' => [
                'dir' => $dirRaiz . '/Cemiterio Central',
                'codNecropole' => '01',
                'nome' => 'Cemitério Central',
            ],
            'CEM-02' => [
                'dir' => $dirRaiz . '/Cemiterio Independencia',
                'codNecropole' => '02',
                'nome' => 'Cemitério Independência',
            ],
            '02' => [
                'dir' => $dirRaiz . '/Cemiterio Independencia',
                'codNecropole' => '02',
                'nome' => 'Cemitério Independência',
            ],
        ];

        $totalReconciliados = 0;
        $totalInalterados = 0;
        $totalNaoEncontrados = 0;
        $totalNovosTitulares = 0;

        foreach ($cemiterios as $codCem => $info) {
            $csvPath = $info['dir'] . '/RESPONSA.csv';
            if (!file_exists($csvPath)) {
                continue;
            }

            // Evitar rodar duplicado se o array tiver chaves '01' e 'CEM-01'
            static $processados = [];
            if (isset($processados[$csvPath])) {
                continue;
            }
            $processados[$csvPath] = true;

            $this->info("Processando RESPONSA.csv para {$info['nome']} (Necrópole {$info['codNecropole']})...");

            $f = fopen($csvPath, 'r');
            if (!$f) {
                $this->warn("Não foi possível abrir: {$csvPath}");
                continue;
            }

            $cabecalho = fgetcsv($f, 0, ',', '"');
            if (!$cabecalho) {
                fclose($f);
                continue;
            }

            $mapaCol = [];
            foreach ($cabecalho as $idx => $nomeCol) {
                $colUpper = strtoupper(trim((string) $nomeCol));
                if (str_starts_with($colUpper, 'QUADRA')) $mapaCol['quadra'] = $idx;
                if (str_starts_with($colUpper, 'LOTE')) $mapaCol['lote'] = $idx;
                if (str_starts_with($colUpper, 'ITEM')) $mapaCol['item'] = $idx;
                if (str_starts_with($colUpper, 'NOME')) $mapaCol['nome'] = $idx;
                if (str_starts_with($colUpper, 'CPF')) $mapaCol['cpf'] = $idx;
                if (str_starts_with($colUpper, 'RG')) $mapaCol['rg'] = $idx;
                if (str_starts_with($colUpper, 'ENDERECO')) $mapaCol['endereco'] = $idx;
                if (str_starts_with($colUpper, 'NUMERO')) $mapaCol['numero'] = $idx;
                if (str_starts_with($colUpper, 'CEP')) $mapaCol['cep'] = $idx;
                if (str_starts_with($colUpper, 'CIDADE')) $mapaCol['cidade'] = $idx;
                if (str_starts_with($colUpper, 'FONE')) $mapaCol['fone'] = $idx;
                if (str_starts_with($colUpper, 'CELULAR')) $mapaCol['celular'] = $idx;
            }

            $linhas = [];
            while (($row = fgetcsv($f, 0, ',', '"')) !== false) {
                $quadra = str_pad(trim($row[$mapaCol['quadra'] ?? 1] ?? ''), 4, '0', STR_PAD_LEFT);
                $lote = str_pad(trim($row[$mapaCol['lote'] ?? 2] ?? ''), 4, '0', STR_PAD_LEFT);
                $item = trim($row[$mapaCol['item'] ?? 3] ?? '1') ?: '1';
                $nome = trim($row[$mapaCol['nome'] ?? 4] ?? '');
                $cpf = trim($row[$mapaCol['cpf'] ?? 6] ?? '');
                $rg = trim($row[$mapaCol['rg'] ?? 5] ?? '');
                $end = trim($row[$mapaCol['endereco'] ?? 7] ?? '');
                $num = trim($row[$mapaCol['numero'] ?? 8] ?? '');
                $cep = trim($row[$mapaCol['cep'] ?? 9] ?? '');
                $cid = trim($row[$mapaCol['cidade'] ?? 10] ?? '');
                $fone = trim($row[$mapaCol['fone'] ?? 11] ?? '');
                $cel = trim($row[$mapaCol['celular'] ?? 12] ?? '');

                if ($nome === '' || $quadra === '0000' || $lote === '0000') {
                    continue;
                }

                $linhas[] = [
                    'quadra' => $quadra,
                    'lote' => $lote,
                    'item' => $item,
                    'nome' => $nome,
                    'cpf' => $cpf,
                    'rg' => $rg,
                    'endereco_completo' => trim("{$end} {$num} {$cep} {$cid}"),
                    'telefone' => $cel ?: $fone,
                ];
            }
            fclose($f);

            $this->line("Total de registros lidos no CSV: " . count($linhas));

            $codNecropole = $info['codNecropole'];

            // Processar em lotes de 100 para alta performance e segurança
            $chunks = array_chunk($linhas, 100);
            $bar = $this->output->createProgressBar(count($linhas));
            $bar->start();

            foreach ($chunks as $chunk) {
                if (!$dryRun) {
                    DB::beginTransaction();
                }

                try {
                    // Pré-carregar concessões deste chunk
                    $numerosConcessao = [];
                    foreach ($chunk as $item) {
                        $numerosConcessao[] = "CON-{$codNecropole}-{$item['quadra']}-{$item['lote']}-{$item['item']}";
                    }

                    $concessoes = Concessao::whereIn('numero', $numerosConcessao)
                        ->get()
                        ->keyBy('numero');

                    foreach ($chunk as $item) {
                        $numConc = "CON-{$codNecropole}-{$item['quadra']}-{$item['lote']}-{$item['item']}";
                        $concessao = $concessoes->get($numConc);

                        if (!$concessao) {
                            $totalNaoEncontrados++;
                            $bar->advance();
                            continue;
                        }

                        $nomeOriginal = $item['nome'];
                        $titularFalecido = str_contains(strtoupper($nomeOriginal), 'FALECIDO');
                        $nomeLimpo = trim(str_ireplace(['[FALECIDO]', '(FALECIDO)', 'FALECIDO'], '', $nomeOriginal));

                        $docLimpo = Documento::somenteDigitos($item['cpf']);
                        if (Documento::valido($docLimpo)) {
                            $docFinal = $docLimpo;
                            $tipoDoc = strlen($docLimpo) === 14 ? 'cnpj' : 'cpf';
                        } else {
                            // Sentinela individualizado e determinístico por jazigo e item
                            $docFinal = "000" . str_pad((string) $concessao->plot_id, 5, '0', STR_PAD_LEFT) . str_pad((string) $item['item'], 3, '0', STR_PAD_LEFT);
                            $tipoDoc = 'cpf';
                        }

                        $docHash = Documento::hash($docFinal);

                        if (!$dryRun) {
                            $titular = Concessionario::withTrashed()->firstOrCreate(
                                ['documento_hash' => $docHash],
                                [
                                    'nome' => $nomeLimpo,
                                    'tipo_doc' => $tipoDoc,
                                    'documento' => $docFinal,
                                    'telefone' => $item['telefone'] ?: null,
                                    'endereco' => $item['endereco_completo'] ?: null,
                                    'titular_falecido' => $titularFalecido,
                                ]
                            );

                            if ($titular->wasRecentlyCreated) {
                                $totalNovosTitulares++;
                            }

                            if ($titular->trashed()) {
                                $titular->restore();
                            }

                            // Caso já existisse mas com outro nome (ex: sentinela gerado antes), sincroniza
                            if ($titular->nome !== $nomeLimpo && str_starts_with($docFinal, '000')) {
                                $titular->update(['nome' => $nomeLimpo, 'titular_falecido' => $titularFalecido]);
                            }

                            if ($concessao->holder_id !== $titular->id) {
                                $concessao->update(['holder_id' => $titular->id]);
                                $totalReconciliados++;
                            } else {
                                $totalInalterados++;
                            }
                        } else {
                            $totalReconciliados++;
                        }

                        $bar->advance();
                    }

                    if (!$dryRun) {
                        DB::commit();
                    }
                } catch (\Throwable $e) {
                    if (!$dryRun) {
                        DB::rollBack();
                    }
                    $this->error("\nErro no lote: " . $e->getMessage());
                    return self::FAILURE;
                }
            }

            $bar->finish();
            $this->newLine(2);
        }

        $this->info("===============================================================");
        $this->info("                   RESULTADO DA RECONCILIAÇÃO                  ");
        $this->info("===============================================================");
        $this->line("Concessões Reconciliadas:  {$totalReconciliados}");
        $this->line("Concessões Inalteradas:    {$totalInalterados}");
        $this->line("Concessões Não Encontradas:{$totalNaoEncontrados}");
        $this->line("Novos Titulares Criados:   {$totalNovosTitulares}");
        $this->info("Reconciliação finalizada com sucesso!");

        return self::SUCCESS;
    }
}

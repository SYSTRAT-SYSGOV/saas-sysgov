<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\LegadoFalecidoIndice;
use Modules\Cemiterios\Models\OcupacaoSubLoteLegado;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Models\SubLoteLegado;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Support\ClipperDbfReader;
use Modules\Cemiterios\Support\Documento;

/**
 * Comando Artisan para migração e compatibilização do acervo histórico em Clipper
 * dos cemitérios Central ('01') e Independência ('02').
 */
final class MigrarClipperCommand extends Command
{
    protected $signature = 'cemiterios:migrar-clipper
        {--tenant= : Slug ou ID do Tenant de destino}
        {--path= : Diretório raiz dos CSVs exportados (padrão: D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data)}
        {--necropole=all : Necrópole a processar (all, 01, 02)}
        {--dry-run : Simulação sem gravar no banco de dados}';

    protected $description = 'Migra acervo histórico do sistema DOS/Clipper (CSVs exportados) para o schema multi-tenant do SYSGOV';

    private const CAMINHO_PADRAO = 'D:/SYSTRAT/Novos Projetos/Gestão Cemitérios/cemiterio/exported_data';

    /** @var array<string, int> */
    private array $estatisticas = [
        'cemiterios' => 0,
        'setores' => 0,
        'jazigos' => 0,
        'concessionarios' => 0,
        'concessoes' => 0,
        'titulares_falecidos' => 0,
        'falecidos' => 0,
        'inumacoes' => 0,
        'indice_legado_falecido' => 0,
        'sublotes_legado' => 0,
        'sublotes_sem_lote_fisico' => 0,
        'ocupacao_sublotes_legado' => 0,
    ];

    public function handle(JazigoEstadoService $estadoService): int
    {
        // Telescope/query log acumulam cada operação em memória; num lote de dezenas de
        // milhares de registros isso cresce sem limite e derruba o processo (heap corrompido).
        if (class_exists(\Laravel\Telescope\Telescope::class)) {
            \Laravel\Telescope\Telescope::stopRecording();
        }
        DB::connection()->disableQueryLog();

        $tenant = $this->resolverTenant();
        if (!$tenant) {
            $this->error('Tenant não encontrado ou não informado.');
            return self::FAILURE;
        }

        app(TenantContext::class)->set($tenant);

        $basePath = (string) ($this->option('path') ?: self::CAMINHO_PADRAO);
        $necropoleOpt = (string) $this->option('necropole');
        $dryRun = (bool) $this->option('dry-run');

        $this->info("===============================================================");
        $this->info("  MIGRAÇÃO DE DADOS CEMITÉRIOS (LEGADO CLIPPER -> SYSGOV)");
        $this->info("===============================================================");
        $this->line("Tenant:       <comment>{$tenant->name} ({$tenant->slug})</comment>");
        $this->line("Origem:       <comment>{$basePath}</comment>");
        $this->line("Modo:         " . ($dryRun ? '<fg=yellow>SIMULAÇÃO (DRY-RUN)</>' : '<fg=green>EXECUÇÃO DEFINITIVA</>'));
        $this->line("Necrópoles:   <comment>{$necropoleOpt}</comment>");
        $this->newLine();

        $pastas = [];
        if ($necropoleOpt === 'all' || $necropoleOpt === '01') {
            $pastas['01'] = [
                'nome' => 'Cemitério Central',
                'caminho' => rtrim($basePath, '/\\') . '/Cemiterio Central',
            ];
        }
        if ($necropoleOpt === 'all' || $necropoleOpt === '02') {
            $pastas['02'] = [
                'nome' => 'Cemitério Independência / Boqueirão',
                'caminho' => rtrim($basePath, '/\\') . '/Cemiterio Independencia',
            ];
        }

        foreach ($pastas as $cod => $info) {
            if (!is_dir($info['caminho'])) {
                $this->warn("Diretório não encontrado para {$info['nome']}: {$info['caminho']}");
                continue;
            }

            $this->info("---------------------------------------------------------------");
            $this->info("Processando Necrópole [{$cod}]: {$info['nome']}");
            $this->info("---------------------------------------------------------------");

            $this->processarNecropole($cod, $info['nome'], $info['caminho'], $dryRun, $estadoService);
        }

        $this->newLine();
        $this->info("===============================================================");
        $this->info("  RESUMO CONSOLIDADO DA CARGA");
        $this->info("===============================================================");
        $tabela = [];
        foreach ($this->estatisticas as $chave => $qtd) {
            $tabela[] = [ucfirst(str_replace('_', ' ', $chave)), number_format($qtd, 0, ',', '.')];
        }
        $this->table(['Entidade', 'Total Registros'], $tabela);

        if ($dryRun) {
            $this->warn("Simulação concluída. Nenhuma alteração foi persistida no banco.");
        } else {
            $this->info("Migração concluída com sucesso e dados devidamente normalizados!");
        }

        return self::SUCCESS;
    }

    private function processarNecropole(string $codigo, string $nome, string $caminho, bool $dryRun, JazigoEstadoService $estadoService): void
    {
        $lotesCsv = "{$caminho}/LOTES.csv";
        $responsaCsv = "{$caminho}/RESPONSA.csv";
        $dadosCsv = "{$caminho}/DADOS.csv";
        $falecidoCsv = "{$caminho}/FALECIDO.csv";

        // FUNCIONA.DBF/PEDREIRO.DBF vivem na pasta bruta do legado (irmã de exported_data),
        // não nos CSVs exportados — resolvidas por necrópole para não misturar cadastros.
        $dbfDir = str_contains($caminho, '/exported_data/')
            ? str_replace('/exported_data/', '/', $caminho)
            : $caminho;
        $mapaFuncionarios = ClipperDbfReader::lerCodigoNome("{$dbfDir}/FUNCIONA.DBF");
        $mapaPedreiros = ClipperDbfReader::lerCodigoNome("{$dbfDir}/PEDREIRO.DBF");

        $cemiterio = null;
        if (!$dryRun) {
            $cemiterio = Cemiterio::withTrashed()->firstOrCreate(
                ['codigo' => "CEM-{$codigo}"],
                ['nome' => $nome, 'tipo' => 'tradicional', 'situacao' => 'ativo']
            );
            if ($cemiterio->trashed()) {
                $cemiterio->restore();
            }
        }
        $this->estatisticas['cemiterios']++;

        // 1. Processar Lotes e Quadras (Setores)
        $setoresMap = [];
        $jazigosMap = [];
        $lotesInfoMap = [];

        if (file_exists($lotesCsv)) {
            $linhasLotes = $this->lerCsv($lotesCsv);
            $this->line("Lendo LOTES.csv: " . count($linhasLotes) . " registros encontrados...");

            // Gravação em lote: cada chunk vira uma única transação, evitando o custo de
            // commit/fsync por linha do autocommit padrão (era o gargalo real da migração).
            foreach (array_chunk($linhasLotes, 500) as $chunk) {
                DB::transaction(function () use ($chunk, $dryRun, $cemiterio, &$setoresMap, &$jazigosMap, &$lotesInfoMap): void {
                    foreach ($chunk as $linha) {
                        $quadra = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                        $lote = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));
                        $tipo = trim((string) ($linha['TIPO'] ?? $linha['tipo'] ?? '1'));
                        $gavetas = (int) ($linha['GAVETAS'] ?? $linha['gavetas'] ?? 1);
                        $processo = trim((string) ($linha['PROCESSO'] ?? $linha['processo'] ?? ''));
                        $validade = $this->parseData($linha['VALIDADE'] ?? $linha['validade'] ?? null);

                        if ($quadra === '' || $lote === '') {
                            continue;
                        }

                        $lotesInfoMap["{$quadra}_{$lote}"] = [
                            'tipo' => $tipo,
                            'processo' => $processo,
                            'validade' => $validade,
                        ];

                        if (!isset($setoresMap[$quadra])) {
                            if (!$dryRun && $cemiterio) {
                                $setor = Setor::withTrashed()->firstOrCreate(
                                    ['park_id' => $cemiterio->id, 'codigo' => $quadra],
                                    ['descricao' => "Quadra {$quadra}", 'tipo_zona' => 'jazigos']
                                );
                                if ($setor->trashed()) {
                                    $setor->restore();
                                }
                                $setoresMap[$quadra] = $setor->id;
                            } else {
                                $setoresMap[$quadra] = 1;
                            }
                            $this->estatisticas['setores']++;
                        }

                        $tipoJazigo = ($tipo === '3') ? 'gaveta' : 'jazigo';
                        $capacidade = max($gavetas, 1);

                        if (!$dryRun && $cemiterio) {
                            $codigoJazigo = "Q{$quadra}-L{$lote}";
                            $jazigo = Jazigo::withTrashed()->firstOrCreate(
                                [
                                    'park_id' => $cemiterio->id,
                                    'codigo' => $codigoJazigo,
                                ],
                                [
                                    'sector_id' => $setoresMap[$quadra],
                                    'codigo_legado' => $codigoJazigo,
                                    'tipo' => $tipoJazigo,
                                    'capacidade' => $capacidade,
                                    'processo_administrativo' => $processo ?: null,
                                ]
                            );
                            if ($jazigo->trashed()) {
                                $jazigo->restore();
                            }
                            $jazigo->refresh();

                            $jazigosMap["{$quadra}_{$lote}"] = $jazigo;
                        } else {
                            $jazigosMap["{$quadra}_{$lote}"] = (object) [
                                'id' => 1,
                                'tipo' => $tipoJazigo,
                                'processo_administrativo' => $processo ?: null,
                            ];
                        }
                        $this->estatisticas['jazigos']++;
                    }
                });
            }
        }

        // 1.5. Preservar índice legado de ocupação (FALECIDO.DBF/csv) para auditoria.
        // Não alimenta nenhuma regra de negócio: os mesmos dados já chegam completos via
        // DADOS.csv (Falecido + Inumacao) — mantido apenas para não descartar a fonte original.
        if (file_exists($falecidoCsv) && !$dryRun && $cemiterio) {
            $linhasFalecido = $this->lerCsv($falecidoCsv);
            $this->line("Lendo FALECIDO.csv: " . count($linhasFalecido) . " registros encontrados...");

            foreach (array_chunk($linhasFalecido, 500) as $chunk) {
                DB::transaction(function () use ($chunk, $cemiterio): void {
                    foreach ($chunk as $linha) {
                        $quadraFal = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                        $loteFal = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));

                        if ($quadraFal === '' || $loteFal === '') {
                            continue;
                        }

                        LegadoFalecidoIndice::firstOrCreate([
                            'park_id' => $cemiterio->id,
                            'quadra_legado' => $quadraFal,
                            'lote_legado' => $loteFal,
                        ]);
                        $this->estatisticas['indice_legado_falecido']++;
                    }
                });
            }
        }

        // 1.6. Preservar sub-lotes com concessão própria (TTT.DBF) e seu índice de
        // ocupação (OBA.DBF), exclusivos do Cemitério Independência — nunca migrados
        // por nenhum comando anterior. Sub-lote sem lote físico correspondente vira
        // pendência de revisão manual, sem interromper a migração dos demais registros.
        if ($codigo === '02' && !$dryRun) {
            $ttCsv = "{$caminho}/TTT.csv";
            $obaCsv = "{$caminho}/OBA.csv";

            $jazigosNormalizados = [];
            foreach ($jazigosMap as $chave => $jazigoRef) {
                [$q, $l] = explode('_', $chave, 2);
                $lNorm = ltrim($l, '0') ?: '0';
                $jazigosNormalizados["{$q}_{$lNorm}"] = $jazigoRef;
            }

            $sublotesPorChave = [];
            if (file_exists($ttCsv)) {
                $linhasTtt = $this->lerCsv($ttCsv);
                $this->line("Lendo TTT.csv: " . count($linhasTtt) . " registros encontrados...");

                foreach (array_chunk($linhasTtt, 500) as $chunk) {
                    DB::transaction(function () use ($chunk, $jazigosNormalizados, &$sublotesPorChave): void {
                        foreach ($chunk as $linha) {
                            $quadra = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                            $loteCompleto = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));
                            $processo = trim((string) ($linha['PROCESSO'] ?? $linha['processo'] ?? ''));
                            $validade = $this->parseData($linha['VALIDADE'] ?? $linha['validade'] ?? null);

                            if ($quadra === '' || $loteCompleto === '') {
                                continue;
                            }

                            $loteBase = (string) preg_replace('/[A-Za-z]+$/', '', $loteCompleto);
                            $loteBaseNorm = ltrim($loteBase, '0') ?: '0';
                            $jazigoRef = $jazigosNormalizados["{$quadra}_{$loteBaseNorm}"] ?? null;

                            if (!$jazigoRef) {
                                $this->estatisticas['sublotes_sem_lote_fisico']++;
                                continue;
                            }

                            $sublote = SubLoteLegado::firstOrCreate(
                                ['plot_id' => $jazigoRef->id, 'codigo_sublote' => $loteCompleto],
                                [
                                    'processo_administrativo' => ($processo !== '' && $processo !== '0') ? $processo : null,
                                    'validade_concessao' => $validade,
                                ]
                            );
                            $sublotesPorChave["{$quadra}_{$loteCompleto}"] = $sublote;
                            $this->estatisticas['sublotes_legado']++;
                        }
                    });
                }
            }

            if (file_exists($obaCsv)) {
                $linhasOba = $this->lerCsv($obaCsv);
                $this->line("Lendo OBA.csv: " . count($linhasOba) . " registros encontrados...");

                foreach (array_chunk($linhasOba, 500) as $chunk) {
                    DB::transaction(function () use ($chunk, &$sublotesPorChave): void {
                        foreach ($chunk as $linha) {
                            $quadra = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                            $lote = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));

                            if ($quadra === '' || $lote === '') {
                                continue;
                            }

                            $sublote = $sublotesPorChave["{$quadra}_{$lote}"] ?? null;
                            if (!$sublote) {
                                continue;
                            }

                            OcupacaoSubLoteLegado::firstOrCreate(['sublot_id' => $sublote->id]);
                            $this->estatisticas['ocupacao_sublotes_legado']++;
                        }
                    });
                }
            }
        }

        // 2. Processar Responsáveis e Concessões
        if (file_exists($responsaCsv)) {
            $linhasResponsa = $this->lerCsv($responsaCsv);
            $this->line("Lendo RESPONSA.csv: " . count($linhasResponsa) . " registros encontrados...");

            foreach (array_chunk($linhasResponsa, 500) as $chunk) {
                DB::transaction(function () use ($chunk, $dryRun, $codigo, $jazigosMap): void {
                    foreach ($chunk as $linha) {
                        $quadra = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                        $lote = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));
                        $item = trim((string) ($linha['ITEM'] ?? $linha['item'] ?? '1')) ?: '1';
                        $nome = trim((string) ($linha['NOME'] ?? $linha['nome'] ?? ''));
                        $cpfCnpj = trim((string) ($linha['CPF_CNPJ'] ?? $linha['cpf_cnpj'] ?? ''));
                        $endereco = trim((string) ($linha['ENDERECO'] ?? $linha['endereco'] ?? ''));
                        $fone = trim((string) ($linha['FONE'] ?? $linha['fone'] ?? ''));
                        $falecidoFlagRaw = trim((string) ($linha['FALECIDO'] ?? $linha['falecido'] ?? ''));

                        if ($nome === '') {
                            continue;
                        }

                        $titularFalecido = (strtoupper($falecidoFlagRaw) === 'S'
                            || str_contains(strtoupper($nome), '[FALECIDO]')
                            || str_contains(strtoupper($nome), 'FALECIDO'));

                        $nomeLimpo = trim(str_ireplace(['[FALECIDO]', '(FALECIDO)', 'FALECIDO'], '', $nome));

                        if ($titularFalecido) {
                            $this->estatisticas['titulares_falecidos']++;
                        }

                        if (isset($jazigosMap["{$quadra}_{$lote}"])) {
                            $jazigo = $jazigosMap["{$quadra}_{$lote}"];

                            $docValido = Documento::somenteDigitos($cpfCnpj);
                            if (strlen($docValido) !== 11 && strlen($docValido) !== 14) {
                                $docValido = "000" . str_pad((string) $jazigo->id, 5, '0', STR_PAD_LEFT) . str_pad((string) $item, 3, '0', STR_PAD_LEFT);
                            }

                            if (!$dryRun) {
                                $titular = Concessionario::withTrashed()->firstOrCreate(
                                    ['documento_hash' => Documento::hash($docValido)],
                                    [
                                        'nome' => $nomeLimpo,
                                        'tipo_doc' => strlen($docValido) === 14 ? 'cnpj' : 'cpf',
                                        'documento' => $docValido,
                                        'telefone' => $fone ?: null,
                                        'endereco' => $endereco ?: null,
                                        'titular_falecido' => $titularFalecido,
                                    ]
                                );
                                if ($titular->trashed()) {
                                    $titular->restore();
                                }

                                $numeroConcessao = "CON-{$codigo}-{$quadra}-{$lote}-{$item}";
                                $concessao = Concessao::withTrashed()->firstOrCreate(
                                    [
                                        'numero' => $numeroConcessao,
                                    ],
                                    [
                                        'plot_id' => $jazigo->id,
                                        'holder_id' => $titular->id,
                                        'modalidade' => ($jazigo->tipo === 'gaveta') ? 'perpetua' : 'temporaria',
                                        'inicio' => '1995-01-01',
                                        'termino' => null,
                                        'processo_administrativo' => $jazigo->processo_administrativo,
                                        'pendencia_regularizacao' => $titularFalecido,
                                        'motivo_pendencia' => $titularFalecido ? 'sucessao_hereditaria' : null,
                                        'situacao' => 'vigente',
                                    ]
                                );
                                if ($concessao->trashed()) {
                                    $concessao->restore();
                                }
                            }
                            $this->estatisticas['concessionarios']++;
                            $this->estatisticas['concessoes']++;
                        }
                    }
                });
            }
        }

        // 3. Processar Falecidos e Inumações
        if (file_exists($dadosCsv)) {
            $linhasDados = $this->lerCsv($dadosCsv);
            $this->line("Lendo DADOS.csv: " . count($linhasDados) . " registros encontrados...");

            foreach (array_chunk($linhasDados, 500) as $chunk) {
                DB::transaction(function () use ($chunk, $dryRun, $codigo, $jazigosMap, $lotesInfoMap, $mapaFuncionarios, $mapaPedreiros): void {
                    foreach ($chunk as $linha) {
                        $quadra = trim((string) ($linha['QUADRA'] ?? $linha['quadra'] ?? ''));
                        $lote = trim((string) ($linha['LOTE'] ?? $linha['lote'] ?? ''));
                        $nome = trim((string) ($linha['NOME'] ?? $linha['nome'] ?? ''));
                        $dtNasc = $this->parseData($linha['DT_NASC'] ?? $linha['dt_nasc'] ?? null);
                        $dtFalecBruta = $this->parseData($linha['DT_FALEC'] ?? $linha['dt_falec'] ?? null);
                        $dtEmiBruta = $this->parseData($linha['DT_EMI'] ?? $linha['dt_emi'] ?? null);
                        $certidao = trim((string) ($linha['CERTIDAO'] ?? $linha['certidao'] ?? ''));
                        $cartorio = trim((string) ($linha['CARTORIO'] ?? $linha['cartorio'] ?? ''));
                        $medico = trim((string) ($linha['MEDICO'] ?? $linha['medico'] ?? ''));
                        $causaMortis = trim((string) ($linha['CAUSA_MORTIS'] ?? $linha['causa_mortis'] ?? ''));
                        $codCoveiro = trim((string) ($linha['COD_FUNC'] ?? $linha['cod_func'] ?? ''));
                        $codPedreiro = trim((string) ($linha['COD_PED'] ?? $linha['cod_ped'] ?? ''));
                        $coveiro = $mapaFuncionarios[(int) $codCoveiro] ?? ($codCoveiro ?: null);
                        $pedreiro = $mapaPedreiros[(int) $codPedreiro] ?? ($codPedreiro ?: null);

                        if ($nome === '') {
                            continue;
                        }

                        if (isset($jazigosMap["{$quadra}_{$lote}"])) {
                            $jazigo = $jazigosMap["{$quadra}_{$lote}"];

                            // Reconciliação precisa de datas:
                            $dataFalecimento = null;
                            $dataSepultamento = null;
                            $revisaoPendente = false;
                            $livroRef = "Legado Clipper Cem. {$codigo}";

                            if ($dtFalecBruta && $dtEmiBruta) {
                                $dataFalecimento = $dtFalecBruta;
                                $dataSepultamento = $dtEmiBruta;
                            } elseif ($dtFalecBruta) {
                                $dataFalecimento = $dtFalecBruta;
                                $dataSepultamento = $dtFalecBruta;
                            } elseif ($dtEmiBruta) {
                                $dataFalecimento = $dtEmiBruta;
                                $dataSepultamento = $dtEmiBruta;
                            } else {
                                // Ambas ausentes no legado Clipper
                                $revisaoPendente = true;
                                $loteInfo = $lotesInfoMap["{$quadra}_{$lote}"] ?? null;
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
                                    } catch (\Throwable) {
                                        $dataFalecimento = '1995-01-01';
                                        $dataSepultamento = '1995-01-01';
                                        $livroRef .= " (Sem data original - marco 1995 - pendente conferência)";
                                    }
                                } else {
                                    $dataFalecimento = '1995-01-01';
                                    $dataSepultamento = '1995-01-01';
                                    $livroRef .= " (Sem data original - marco 1995 - pendente conferência)";
                                }
                            }

                            if (!$dryRun) {
                                $falecido = Falecido::firstOrCreate(
                                    [
                                        'nome' => $nome,
                                        'falecimento' => $dataFalecimento,
                                    ],
                                    [
                                        'nascimento' => $dtNasc,
                                        'certidao_numero' => ($certidao && $certidao !== '1' && $certidao !== '111111') ? $certidao : null,
                                        'certidao_cartorio' => ($cartorio && !str_contains(strtoupper($cartorio), 'FALTA')) ? $cartorio : null,
                                        'causa_morte' => ($causaMortis && $causaMortis !== '1' && $causaMortis !== '4') ? $causaMortis : null,
                                    ]
                                );

                                Inumacao::updateOrCreate(
                                    [
                                        'deceased_id' => $falecido->id,
                                        'plot_id' => $jazigo->id,
                                    ],
                                    [
                                        'sepultado_em' => "{$dataSepultamento} 10:00:00",
                                        'carencia_desde' => $dataSepultamento,
                                        'origem' => 'historico',
                                        'livro_referencia' => $livroRef,
                                        'revisao_pendente' => $revisaoPendente,
                                        'coveiro_nome' => $coveiro ?: null,
                                        'pedreiro_nome' => $pedreiro ?: null,
                                        'cartorio' => ($cartorio && !str_contains(strtoupper($cartorio), 'FALTA')) ? $cartorio : null,
                                        'medico' => ($medico && $medico !== '1') ? $medico : null,
                                        'situacao' => 'confirmada',
                                    ]
                                );
                            }
                            $this->estatisticas['falecidos']++;
                            $this->estatisticas['inumacoes']++;
                        }
                    }
                });
            }
        }

        // 4. Recalcular ocupações e estados
        if (!$dryRun && $cemiterio) {
            $this->line("Recalculando estado físico e ocupação dos jazigos...");
            $driver = DB::connection()->getDriverName();
            if ($driver === 'mysql') {
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
                    WHERE p.park_id = ?
                ", [$cemiterio->id]);
            } else {
                foreach ($jazigosMap as $jazigo) {
                    $totalInumacoes = Inumacao::where('plot_id', $jazigo->id)->where('situacao', 'confirmada')->count();
                    DB::table('plot_inventory')->where('id', $jazigo->id)->update(['ocupacao' => $totalInumacoes]);
                    $jazigo->refresh();
                    $estadoService->recalcular($jazigo, 'Migração Legado Clipper');
                }
            }
        }
    }

    private function parseData(?string $valor): ?string
    {
        if (!$valor) {
            return null;
        }
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

    /** @return list<array<string, string>> */
    private function lerCsv(string $caminho): array
    {
        $linhas = [];
        if (!file_exists($caminho)) {
            return $linhas;
        }

        $f = fopen($caminho, 'r');
        if (!$f) {
            return $linhas;
        }

        $cabecalho = fgetcsv($f, 0, ',', '"');
        if (!$cabecalho) {
            fclose($f);
            return $linhas;
        }

        $cabecalho = array_map(function ($col) {
            $c = strtoupper(trim((string) $col));
            if (str_starts_with($c, 'QUADRA')) return 'QUADRA';
            if (str_starts_with($c, 'LOTE')) return 'LOTE';
            if (str_starts_with($c, 'ITEM')) return 'ITEM';
            if (str_starts_with($c, 'TIPO')) return 'TIPO';
            if (str_starts_with($c, 'GAVETA')) return 'GAVETAS';
            if (str_starts_with($c, 'PROCESSO')) return 'PROCESSO';
            if (str_starts_with($c, 'VALIDADE')) return 'VALIDADE';
            if (str_starts_with($c, 'NOME')) return 'NOME';
            if (str_starts_with($c, 'CPF')) return 'CPF_CNPJ';
            if (str_starts_with($c, 'RG')) return 'RG';
            if (str_starts_with($c, 'ENDERECO')) return 'ENDERECO';
            if (str_starts_with($c, 'FONE')) return 'FONE';
            if (str_starts_with($c, 'CELULAR')) return 'CELULAR';
            if (str_starts_with($c, 'DT_NASC')) return 'DT_NASC';
            if (str_starts_with($c, 'DT_FAL')) return 'DT_FALEC';
            if (str_starts_with($c, 'DT_EMI')) return 'DT_EMI';
            if (str_starts_with($c, 'CERTIDAO')) return 'CERTIDAO';
            if (str_starts_with($c, 'CARTORIO')) return 'CARTORIO';
            if (str_starts_with($c, 'MEDICO')) return 'MEDICO';
            if (str_starts_with($c, 'CAUSA')) return 'CAUSA_MORTIS';
            if (str_starts_with($c, 'COD_FUNC')) return 'COD_FUNC';
            if (str_starts_with($c, 'COD_PED')) return 'COD_PED';
            return $c;
        }, $cabecalho);

        while (($row = fgetcsv($f, 0, ',', '"')) !== false) {
            if (count($row) === count($cabecalho)) {
                $linhas[] = array_combine($cabecalho, $row);
            }
        }

        fclose($f);
        return $linhas;
    }

    private function resolverTenant(): ?Tenant
    {
        $opt = $this->option('tenant');
        if ($opt) {
            return is_numeric($opt)
                ? Tenant::find((int) $opt)
                : Tenant::where('slug', $opt)->first();
        }

        return Tenant::first();
    }
}

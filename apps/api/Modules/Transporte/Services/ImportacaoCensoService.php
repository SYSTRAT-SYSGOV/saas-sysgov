<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Services\AlunoService;
use Modules\Pessoas\Support\Documento;
use Modules\Transporte\Censo\Importacao\CampoImportacao;
use Modules\Transporte\Censo\Importacao\ConversorCampo;
use Modules\Transporte\Censo\Importacao\Destinos;
use Modules\Transporte\Censo\Importacao\LeitorEducacenso;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\CensoExtra;
use Modules\Transporte\Models\CensoLeiaute;
use Modules\Transporte\Models\Importacao;
use Throwable;

/**
 * Importação do arquivo do Educacenso (design D-I5 a D-I8). Duas passadas: a primeira acha as matrículas com transporte
 * escolar público; a segunda lê escola, turma e pessoa só delas. A escola e o aluno precisam estar cadastrados: nada é
 * criado. O que se grava no aluno é o `inep_id` vazio e os campos extras; nome, turma e demais dados não são tocados.
 * Cada aluno roda numa transação própria — na prévia ela é desfeita, na confirmação é concluída.
 */
final class ImportacaoCensoService
{
    public const MAX_ITENS = 500;

    private const LINHAS_DO_TESTE = 500;

    private const AMOSTRAS_POR_REGISTRO = 3;

    public function __construct(
        private readonly LeiauteImportacaoService $leiautes,
        private readonly AlunoService $alunos,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Mostra, por tipo de registro, como o leiaute lê as primeiras linhas do arquivo. Não grava nada; dado sensível sai
     * mascarado.
     *
     * @return array{linhas_lidas: int, registros: list<array<string, mixed>>, desconhecidos: int, alertas: list<array<string, mixed>>}
     */
    public function testar(UploadedFile $arquivo, CensoLeiaute $leiaute): array
    {
        $porRegistro = [];
        foreach ($this->leiautes->campos($leiaute, true) as $campo) {
            $porRegistro[$campo->registro][] = $campo;
        }

        $leitor = new LeitorEducacenso((string) $arquivo->getRealPath(), $leiaute->delimitador, $leiaute->codificacao);
        $contagem = [];
        $amostras = [];
        $alertas = [];
        $lidas = 0;
        $desconhecidos = 0;

        foreach ($leitor->linhas() as $cols) {
            if ($lidas++ >= self::LINHAS_DO_TESTE) {
                break;
            }
            $registro = $cols[0] ?? '';
            if (!isset($porRegistro[$registro])) {
                $desconhecidos++;

                continue;
            }
            $contagem[$registro] = ($contagem[$registro] ?? 0) + 1;
            $mostrar = count($amostras[$registro] ?? []) < self::AMOSTRAS_POR_REGISTRO;
            $linha = [];
            foreach ($porRegistro[$registro] as $campo) {
                $existe = array_key_exists($campo->posicao, $cols);
                $bruto = $cols[$campo->posicao] ?? '';
                $motivo = $existe ? ConversorCampo::problema($campo, $bruto) : 'a linha tem menos colunas que a posição configurada';
                if ($motivo !== null) {
                    $k = $registro . ':' . $campo->chave . ':' . ($existe ? 'valor' : 'coluna');
                    $alertas[$k] ??= ['registro' => $registro, 'chave' => $campo->chave, 'rotulo' => $campo->rotulo, 'posicao' => $campo->posicao, 'codigo' => $existe ? 'valor_incoerente' : 'coluna_inexistente', 'mensagem' => ucfirst($motivo), 'ocorrencias' => 0];
                    $alertas[$k]['ocorrencias']++;
                }
                if ($mostrar) {
                    $linha[] = ['posicao' => $campo->posicao, 'chave' => $campo->chave, 'rotulo' => $campo->rotulo, 'valor' => ConversorCampo::mascarar($campo, $bruto), 'alerta' => $motivo];
                }
            }
            if ($mostrar) {
                $amostras[$registro][] = $linha;
            }
        }

        $registros = [];
        foreach (Destinos::REGISTROS as $codigo => $nome) {
            $registros[] = ['registro' => $codigo, 'nome' => $nome, 'linhas' => $contagem[$codigo] ?? 0, 'amostras' => $amostras[$codigo] ?? []];
        }

        return ['linhas_lidas' => min($lidas, self::LINHAS_DO_TESTE), 'registros' => $registros, 'desconhecidos' => $desconhecidos, 'alertas' => array_values($alertas)];
    }

    /** Lê e concilia o arquivo sem gravar nada, guarda-o até a confirmação e devolve o resumo. */
    public function previa(UploadedFile $arquivo, CensoLeiaute $leiaute, ?int $usuarioId): Importacao
    {
        $caminho = 'transporte-importacoes/' . app(TenantContext::class)->id() . '/' . Str::uuid() . '.txt';
        Storage::disk('local')->put($caminho, (string) file_get_contents((string) $arquivo->getRealPath()));
        try {
            $opcoes = ['casar_por_nome' => true];
            $r = $this->analisar(Storage::disk('local')->path($caminho), $leiaute, $opcoes, false, null);
        } catch (Throwable $e) {
            Storage::disk('local')->delete($caminho);
            throw $e;
        }

        $importacao = Importacao::create([
            'tipo' => 'censo', 'leiaute_id' => $leiaute->id, 'arquivo_nome' => Str::limit($arquivo->getClientOriginalName(), 250, ''),
            'arquivo_caminho' => $caminho, 'status' => 'previa', 'total' => $r['resumo']['com_transporte'], 'validas' => $r['casados'],
            'ignoradas' => $r['pendentes'], 'com_erro' => $r['resumo']['erros'], 'relatorio' => $this->relatorio($r, $leiaute, $opcoes), 'criado_por' => $usuarioId,
        ]);
        $this->audit->record('transporte', 'importacao.previa', "importacao:{$importacao->id}", null, [
            'tipo' => 'censo', 'arquivo' => $importacao->arquivo_nome, 'leiaute' => $leiaute->nome, ...$r['resumo'],
        ]);

        return $importacao;
    }

    /** Processa de verdade (chamado pelo job). O arquivo é apagado ao fim, com sucesso ou não. */
    public function processar(Importacao $importacao): void
    {
        $importacao->update(['status' => 'processando']);
        try {
            $leiaute = CensoLeiaute::query()->find($importacao->leiaute_id)
                ?? throw new DomainException('O leiaute usado na pré-visualização não existe mais. Envie o arquivo de novo.');
            if ($importacao->arquivo_caminho === null || !Storage::disk('local')->exists($importacao->arquivo_caminho)) {
                throw new DomainException('O arquivo da importação não está mais disponível. Envie-o de novo.');
            }
            $opcoes = $this->opcoes($importacao->relatorio['opcoes'] ?? []);
            $r = $this->analisar(Storage::disk('local')->path($importacao->arquivo_caminho), $leiaute, $opcoes, true, $importacao->id);
            $importacao->update([
                'status' => 'concluida', 'total' => $r['resumo']['com_transporte'], 'validas' => $r['casados'], 'criadas' => $r['resumo']['inep_preenchido'],
                'ignoradas' => $r['pendentes'], 'com_erro' => $r['resumo']['erros'], 'relatorio' => $this->relatorio($r, $leiaute, $opcoes), 'concluida_em' => now(),
            ]);
            $this->audit->record('transporte', 'importacao.concluida', "importacao:{$importacao->id}", null, [
                'tipo' => 'censo', 'arquivo' => $importacao->arquivo_nome, 'leiaute' => $leiaute->nome, 'usuario_id' => $importacao->criado_por, ...$r['resumo'],
            ]);
        } catch (Throwable $e) {
            Log::warning('Importação do Censo falhou', ['importacao' => $importacao->id, 'erro' => $e->getMessage()]);
            $importacao->update(['status' => 'falha', 'mensagem' => $e instanceof DomainException ? $e->getMessage() : 'Erro inesperado ao processar o arquivo.', 'concluida_em' => now()]);
        } finally {
            if ($importacao->arquivo_caminho !== null) {
                Storage::disk('local')->delete($importacao->arquivo_caminho);
                $importacao->update(['arquivo_caminho' => null]);
            }
        }
    }

    /**
     * @param array<string, mixed> $bruto
     * @return array{casar_por_nome: bool}
     */
    public function opcoes(array $bruto): array
    {
        return ['casar_por_nome' => (bool) ($bruto['casar_por_nome'] ?? true)];
    }

    /**
     * @param array{casar_por_nome: bool} $opcoes
     * @return array{resumo: array<string, int>, casados: int, pendentes: int, itens: list<array{linha: int, codigo: string, mensagem: string}>, avisos: list<array{linha: int, mensagem: string}>, escolas_pendentes: list<array{inep: string, alunos: int}>, sem_alocacao_ids: list<int>, truncado: bool}
     */
    private function analisar(string $caminho, CensoLeiaute $leiaute, array $opcoes, bool $gravar, ?int $importacaoId): array
    {
        if ($gravar) {
            @set_time_limit(0);
        }
        $campos = $this->leiautes->campos($leiaute, true);
        /** @var array<int|string, array<string, CampoImportacao>> $conc destino → campo, por registro */
        $conc = [];
        /** @var array<int|string, list<CampoImportacao>> $extras */
        $extras = [];
        foreach ($campos as $c) {
            if (Destinos::ehExtra($c->destino)) {
                $extras[$c->registro][] = $c;
            } else {
                $conc[$c->registro][$c->destino] = $c;
            }
        }
        $leitor = new LeitorEducacenso($caminho, $leiaute->delimitador, $leiaute->codificacao);

        $resumo = array_fill_keys([
            'registros_lidos', 'matriculas_lidas', 'com_transporte', 'casados_inep', 'casados_cpf', 'casados_nome', 'inep_preenchido',
            'alunos_nao_cadastrados', 'alunos_ambiguos', 'alunos_em_escola_nao_cadastrada', 'divergencias', 'erros', 'sem_alocacao', 'extras_gravados',
        ], 0);
        $itens = [];
        $avisos = [];
        $truncado = false;
        $registrar = function (string $lista, array $dado) use (&$itens, &$avisos, &$truncado): void {
            $alvo = $lista === 'itens' ? $itens : $avisos;
            if (count($alvo) >= self::MAX_ITENS) {
                $truncado = true;

                return;
            }
            $lista === 'itens' ? $itens[] = $dado : $avisos[] = $dado;
        };

        // Passada 1 — matrículas com transporte escolar público.
        $mats = [];
        $reconhecido = false;
        foreach ($leitor->linhas() as $n => $cols) {
            $registro = $cols[0] ?? '';
            if (isset(Destinos::REGISTROS[$registro])) {
                $reconhecido = true;
                $resumo['registros_lidos']++;
            }
            if ($registro !== '60') {
                continue;
            }
            $resumo['matriculas_lidas']++;
            $v = $this->valores($cols, $conc['60'] ?? []);
            if (($v['matricula.transporte'] ?? '0') !== '1') {
                continue;
            }
            $escola = $v['matricula.escola_inep'] ?? null;
            $ref = $v['matricula.aluno_inep'] ?? $v['matricula.id_proprio'] ?? null;
            if ($escola === null || $ref === null) {
                $resumo['erros']++;
                $registrar('itens', ['linha' => $n, 'codigo' => 'matricula_sem_identificador', 'mensagem' => 'Matrícula com transporte sem o código da escola ou do aluno.']);

                continue;
            }
            $chave = $escola . '|' . $ref;
            if (isset($mats[$chave])) {
                $registrar('avisos', ['linha' => $n, 'mensagem' => "Matrícula repetida no arquivo (aluno {$ref}, escola {$escola}); usada a primeira."]);

                continue;
            }
            $resumo['com_transporte']++;
            $mats[$chave] = [
                'linha' => $n, 'escola' => $escola, 'ref' => $ref, 'aluno_inep' => $v['matricula.aluno_inep'] ?? null,
                'turma' => $v['matricula.turma_inep'] ?? null, 'extras' => $this->lerExtras($cols, $extras['60'] ?? []),
            ];
        }
        if (!$reconhecido) {
            throw new DomainException('Nenhum registro do Educacenso (00, 20, 30 ou 60) foi encontrado. Confira o delimitador e a codificação do leiaute.');
        }

        // Passada 2 — escola, turma e pessoa apenas das matrículas encontradas.
        $escolasUsadas = [];
        $turmasUsadas = [];
        foreach ($mats as $m) {
            $escolasUsadas[$m['escola']] = true;
            if ($m['turma'] !== null) {
                $turmasUsadas[$m['escola'] . '|' . $m['turma']] = true;
            }
        }
        $escolasDados = [];
        $turmasDados = [];
        $pessoas = [];
        if ($mats !== []) {
            foreach ($leitor->linhas() as $cols) {
                $registro = $cols[0] ?? '';
                if ($registro === '00') {
                    $inep = $this->valores($cols, $conc['00'] ?? [])['escola.inep'] ?? null;
                    if ($inep !== null && isset($escolasUsadas[$inep])) {
                        $escolasDados[$inep] = [...($escolasDados[$inep] ?? []), ...$this->lerExtras($cols, $extras['00'] ?? [])];
                    }
                } elseif ($registro === '20') {
                    $v = $this->valores($cols, $conc['20'] ?? []);
                    $k = ($v['turma.escola_inep'] ?? '') . '|' . ($v['turma.inep'] ?? '');
                    if (isset($turmasUsadas[$k])) {
                        $turmasDados[$k] = [...($turmasDados[$k] ?? []), ...$this->lerExtras($cols, $extras['20'] ?? [])];
                    }
                } elseif ($registro === '30') {
                    $v = $this->valores($cols, $conc['30'] ?? []);
                    $ref = $v['pessoa.inep'] ?? $v['pessoa.id_proprio'] ?? null;
                    $k = ($v['pessoa.escola_inep'] ?? '') . '|' . ($ref ?? '');
                    if ($ref !== null && isset($mats[$k])) {
                        $pessoas[$k] = [
                            'cpf' => $v['aluno.cpf'] ?? null, 'nome' => $v['aluno.nome'] ?? null, 'nascimento' => $v['aluno.nascimento'] ?? null,
                            'extras' => $this->lerExtras($cols, $extras['30'] ?? []),
                        ];
                    }
                }
            }
        }

        // Conciliação com o cadastro (nada é criado).
        $escolasCache = [];
        $turmasCache = [];
        $escolasPendentes = [];
        $escolasAchadas = [];
        $turmasAchadas = [];
        $semAlocacao = [];
        $casados = 0;
        $pendentes = 0;

        foreach ($mats as $chave => $m) {
            $escola = $escolasCache[$m['escola']] ??= Escola::query()->where('inep', $m['escola'])->first() ?? false;
            if ($escola === false) {
                $escolasPendentes[$m['escola']] = ($escolasPendentes[$m['escola']] ?? 0) + 1;
                $resumo['alunos_em_escola_nao_cadastrada']++;
                $pendentes++;

                continue;
            }
            $escolasAchadas[$m['escola']] = $escola;
            if ($m['turma'] !== null) {
                $kt = $m['escola'] . '|' . $m['turma'];
                if (!array_key_exists($kt, $turmasCache)) {
                    $turmasCache[$kt] = Turma::query()->withoutGlobalScope('escola')->where('escola_id', $escola->id)->where('inep', $m['turma'])->first();
                    if ($turmasCache[$kt] === null) {
                        $registrar('avisos', ['linha' => $m['linha'], 'mensagem' => "Turma {$m['turma']} da escola {$m['escola']} não está cadastrada; a turma do aluno não é alterada."]);
                    } else {
                        $turmasAchadas[$kt] = $turmasCache[$kt];
                    }
                }
            }

            $p = $pessoas[$chave] ?? null;
            $mensagemRef = "aluno {$m['ref']} da escola {$m['escola']}";
            DB::beginTransaction();
            try {
                [$aluno, $metodo, $ambiguo] = $this->acharAluno($m, $p, $escola, $opcoes['casar_por_nome']);
                if ($ambiguo) {
                    DB::rollBack();
                    $resumo['alunos_ambiguos']++;
                    $pendentes++;
                    $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'aluno_ambiguo', 'mensagem' => "Mais de um aluno cadastrado combina com o {$mensagemRef}; nenhum foi alterado."]);

                    continue;
                }
                if ($aluno === null) {
                    DB::rollBack();
                    $resumo['alunos_nao_cadastrados']++;
                    $pendentes++;
                    $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'aluno_nao_cadastrado', 'mensagem' => "O {$mensagemRef} não está cadastrado no Escola."]);

                    continue;
                }

                if ($metodo === 'inep' && $this->cpfDiverge($aluno, $p)) {
                    DB::rollBack();
                    $resumo['divergencias']++;
                    $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'cpf_divergente', 'mensagem' => "O {$mensagemRef} tem o mesmo código Inep de um aluno cadastrado com outro CPF; nada foi alterado."]);

                    continue;
                }

                $casados++;
                $resumo['casados_' . $metodo]++;
                if ($aluno->escola_id !== $escola->id) {
                    $resumo['divergencias']++;
                    $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'escola_divergente', 'mensagem' => "O {$mensagemRef} está cadastrado em outra escola; nada foi alterado."]);
                    $gravar ? DB::commit() : DB::rollBack();

                    continue;
                }
                if ($m['aluno_inep'] !== null) {
                    if ($aluno->inep_id === null) {
                        $this->alunos->atualizar($aluno, ['inep_id' => $m['aluno_inep']]);
                        $resumo['inep_preenchido']++;
                    } elseif ($aluno->inep_id !== $m['aluno_inep']) {
                        $resumo['divergencias']++;
                        $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'inep_divergente', 'mensagem' => "O {$mensagemRef} já tem outro código Inep cadastrado; foi mantido o do cadastro."]);
                    }
                }
                $resumo['extras_gravados'] += $this->gravarExtras('aluno', $aluno->id, [...$m['extras'], ...($p['extras'] ?? [])], $importacaoId);
                if (!Alocacao::query()->where('aluno_id', $aluno->id)->whereNull('data_fim')->exists()) {
                    $resumo['sem_alocacao']++;
                    $semAlocacao[] = $aluno->id;
                }
                $gravar ? DB::commit() : DB::rollBack();
            } catch (Throwable $e) {
                DB::rollBack();
                $resumo['erros']++;
                $registrar('itens', ['linha' => $m['linha'], 'codigo' => 'erro', 'mensagem' => "O {$mensagemRef}: " . $this->mensagem($e)]);
            }
        }

        // Extras de escola e turma, uma vez cada.
        DB::beginTransaction();
        try {
            foreach ($escolasAchadas as $inep => $escola) {
                $resumo['extras_gravados'] += $this->gravarExtras('escola', $escola->id, $escolasDados[$inep] ?? [], $importacaoId);
            }
            foreach ($turmasAchadas as $k => $turma) {
                $resumo['extras_gravados'] += $this->gravarExtras('turma', $turma->id, $turmasDados[$k] ?? [], $importacaoId);
            }
            $gravar ? DB::commit() : DB::rollBack();
        } catch (Throwable $e) {
            DB::rollBack();
            $resumo['erros']++;
            $registrar('itens', ['linha' => 0, 'codigo' => 'erro', 'mensagem' => 'Extras de escola ou turma: ' . $this->mensagem($e)]);
        }

        $listaEscolas = [];
        foreach ($escolasPendentes as $inep => $quantos) {
            $listaEscolas[] = ['inep' => (string) $inep, 'alunos' => $quantos];
        }
        usort($listaEscolas, static fn (array $a, array $b): int => $b['alunos'] <=> $a['alunos']);

        return [
            'resumo' => $resumo, 'casados' => $casados, 'pendentes' => $pendentes, 'itens' => $itens, 'avisos' => $avisos,
            'escolas_pendentes' => array_slice($listaEscolas, 0, self::MAX_ITENS), 'sem_alocacao_ids' => array_slice($semAlocacao, 0, self::MAX_ITENS), 'truncado' => $truncado,
        ];
    }

    /**
     * @param array<string, CampoImportacao> $campos destino → campo
     * @param list<string> $cols
     * @return array<string, string> destino → valor convertido (ausente quando vazio)
     */
    private function valores(array $cols, array $campos): array
    {
        $saida = [];
        foreach ($campos as $destino => $campo) {
            $v = ConversorCampo::converter($campo, $cols[$campo->posicao] ?? '');
            if ($v !== null) {
                $saida[$destino] = $v;
            }
        }

        return $saida;
    }

    /**
     * @param list<CampoImportacao> $campos
     * @param list<string> $cols
     * @return array<string, array{valor: string, sensivel: bool}>
     */
    private function lerExtras(array $cols, array $campos): array
    {
        $saida = [];
        foreach ($campos as $campo) {
            $v = ConversorCampo::converter($campo, $cols[$campo->posicao] ?? '');
            if ($v !== null) {
                $saida[$campo->chave] = ['valor' => $v, 'sensivel' => $campo->sensivel];
            }
        }

        return $saida;
    }

    /**
     * @param array<string, array{valor: string, sensivel: bool}> $extras
     */
    private function gravarExtras(string $entidade, int $id, array $extras, ?int $importacaoId): int
    {
        foreach ($extras as $chave => $e) {
            CensoExtra::query()->updateOrCreate(
                ['entidade' => $entidade, 'entidade_id' => $id, 'chave' => $chave],
                ['valor' => $e['valor'], 'sensivel' => $e['sensivel'], 'importacao_id' => $importacaoId],
            );
        }

        return count($extras);
    }

    /**
     * @param array<string, mixed> $m matrícula
     * @param array<string, mixed>|null $p pessoa (Registro 30)
     * @return array{0: Aluno|null, 1: string|null, 2: bool} aluno, método de casamento e se ficou ambíguo
     */
    private function acharAluno(array $m, ?array $p, Escola $escola, bool $porNome): array
    {
        if ($m['aluno_inep'] !== null) {
            $aluno = Aluno::query()->withoutGlobalScope('escola')->where('inep_id', $m['aluno_inep'])->first();
            if ($aluno !== null) {
                return [$aluno, 'inep', false];
            }
        }

        $digitos = Documento::somenteDigitos((string) ($p['cpf'] ?? ''));
        if (strlen($digitos) === 11) {
            $achados = Aluno::query()->withoutGlobalScope('escola')
                ->whereHas('pessoa', fn ($q) => $q->where('documento_hash', Documento::hash($digitos)))->get();
            if ($achados->count() > 1) {
                $daEscola = $achados->where('escola_id', $escola->id);
                $achados = $daEscola->count() === 1 ? $daEscola : $achados;
            }
            if ($achados->count() === 1) {
                return [$achados->first(), 'cpf', false];
            }
            if ($achados->count() > 1) {
                return [null, null, true];
            }
        }

        if ($porNome && ($p['nome'] ?? null) !== null && ($p['nascimento'] ?? null) !== null) {
            $nome = $this->normalizar((string) $p['nome']);
            $candidatos = Aluno::query()->withoutGlobalScope('escola')->where('escola_id', $escola->id)
                ->whereHas('pessoa', fn ($q) => $q->whereDate('data_nascimento', (string) $p['nascimento']))
                ->get()->filter(fn (Aluno $a): bool => $this->normalizar($a->nome) === $nome)->values();
            if ($candidatos->count() === 1) {
                return [$candidatos->first(), 'nome', false];
            }
            if ($candidatos->count() > 1) {
                return [null, null, true];
            }
        }

        return [null, null, false];
    }

    /**
     * O aluno achado pelo Inep tem CPF cadastrado e o arquivo traz outro: provável código trocado.
     *
     * @param array<string, mixed>|null $p
     */
    private function cpfDiverge(Aluno $aluno, ?array $p): bool
    {
        $digitos = Documento::somenteDigitos((string) ($p['cpf'] ?? ''));
        $cadastrado = $aluno->pessoa?->documento_hash;

        return strlen($digitos) === 11 && $cadastrado !== null && $cadastrado !== Documento::hash($digitos);
    }

    private function normalizar(string $nome): string
    {
        return Str::lower(Str::ascii(trim((string) preg_replace('/\s+/', ' ', $nome))));
    }

    private function mensagem(Throwable $e): string
    {
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return implode(' ', array_map(static fn (array $m): string => implode(' ', $m), $e->errors()));
        }
        if ($e instanceof DomainException) {
            return $e->getMessage();
        }
        Log::warning('Erro inesperado na importação do Censo', ['erro' => $e->getMessage()]);

        return 'erro inesperado ao processar a linha.';
    }

    /**
     * @param array{resumo: array<string, int>, casados: int, pendentes: int, itens: list<array{linha: int, codigo: string, mensagem: string}>, avisos: list<array{linha: int, mensagem: string}>, escolas_pendentes: list<array{inep: string, alunos: int}>, sem_alocacao_ids: list<int>, truncado: bool} $r
     * @param array{casar_por_nome: bool} $opcoes
     * @return array<string, mixed>
     */
    private function relatorio(array $r, CensoLeiaute $leiaute, array $opcoes): array
    {
        return [
            'divergencias' => $r['itens'], 'avisos' => $r['avisos'], 'truncado' => $r['truncado'], 'resumo' => $r['resumo'],
            'escolas_pendentes' => $r['escolas_pendentes'], 'sem_alocacao_ids' => $r['sem_alocacao_ids'], 'opcoes' => $opcoes,
            'leiaute' => ['id' => $leiaute->id, 'nome' => $leiaute->nome, 'ano_censo' => $leiaute->ano_censo],
        ];
    }
}

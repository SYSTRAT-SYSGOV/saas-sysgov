<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Carbon\Carbon;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Support\LeitorCsv;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;
use Modules\Transporte\Enums\OrigemVeiculo;
use Modules\Transporte\Enums\TipoRede;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Importacao;
use Modules\Transporte\Models\Parada;
use Throwable;

/**
 * Importação por CSV (design D31): prévia → confirmação → fila. Cada linha passa pelos mesmos Services do cadastro
 * manual (regras de CNH, placa, capacidade, etc.), dentro de uma transação própria: na prévia ela é desfeita, no
 * processamento é confirmada. Linhas com erro não impedem as válidas. Não cria pessoa: o motorista é ligado, pelo CPF,
 * a uma pessoa que já está no Cadastro de Pessoas.
 */
final class ImportacaoTransporteService
{
    public const TIPOS = ['veiculos', 'motoristas', 'paradas'];

    public const MAX_DIVERGENCIAS = 500;

    private const OBRIGATORIAS = [
        'veiculos' => ['ORIGEM', 'PLACA', 'DESCRICAO', 'CAPACIDADE', 'TIPO_REDE', 'TIPOLOGIA_INEP'],
        'motoristas' => ['CPF', 'CNH_NUMERO', 'CNH_CATEGORIA', 'CNH_VALIDADE'],
        'paradas' => ['NOME'],
    ];

    private const MODELOS = [
        'veiculos' => [
            ['origem', 'cnpj_empresa', 'placa', 'descricao', 'capacidade', 'tipo_rede', 'tipologia_inep', 'renavam', 'chassi', 'marca_modelo', 'ano_fabricacao', 'ano_modelo', 'acessivel', 'uso_exclusivo', 'observacoes'],
            ['propria', '', 'ABC1D23', 'Ônibus escolar 01', '44', 'rural', '3', '', '', 'Mercedes OF-1519', '2020', '2021', 'nao', 'sim', ''],
        ],
        'motoristas' => [
            ['cpf', 'cnh_numero', 'cnh_categoria', 'cnh_validade', 'cnh_primeira_habilitacao', 'curso_certificado', 'curso_validade', 'toxicologico_data', 'toxicologico_validade', 'cnpj_empresa', 'observacoes'],
            ['000.000.000-00', '12345678900', 'D', '31/12/2030', '15/03/2010', 'CURSO-123', '31/12/2027', '10/01/2026', '10/01/2029', '', ''],
        ],
        'paradas' => [
            ['nome', 'latitude', 'longitude', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'referencia'],
            ['Ponte do Rio', '-25,4284', '-49,2733', '80000-000', 'Estrada Velha', 's/n', '', 'Zona Rural', 'Rio Claro', 'PR', 'Em frente à igreja'],
        ],
    ];

    public function __construct(
        private readonly VeiculoService $veiculos,
        private readonly MotoristaService $motoristas,
        private readonly ParadaService $paradas,
        private readonly AuditLogger $audit,
    ) {}

    /** CSV de exemplo (cabeçalho e uma linha) para o usuário baixar. */
    public function modelo(string $tipo): string
    {
        $this->exigirTipo($tipo);
        $saida = \Modules\Transporte\Support\Csv::BOM;
        foreach (self::MODELOS[$tipo] as $linha) {
            $saida .= \Modules\Transporte\Support\Csv::linha($linha);
        }

        return $saida;
    }

    /** Lê e valida o arquivo sem gravar nada, guarda-o até a confirmação e devolve o resumo. */
    public function previa(string $tipo, UploadedFile $arquivo, ?int $usuarioId): Importacao
    {
        $this->exigirTipo($tipo);
        $conteudo = (string) file_get_contents($arquivo->getRealPath());
        if (str_contains(substr($conteudo, 0, 4096), "\0")) {
            throw new DomainException('O arquivo não é um CSV de texto.');
        }
        $leitor = LeitorCsv::deTexto($conteudo);
        $faltando = array_values(array_filter(self::OBRIGATORIAS[$tipo], fn (string $c): bool => !$leitor->temColuna($c)));
        if ($faltando !== []) {
            throw new DomainException('Faltam colunas obrigatórias no arquivo: ' . implode(', ', $faltando) . '. Baixe o modelo.');
        }

        $r = $this->analisar($tipo, $leitor, false);
        $caminho = 'transporte-importacoes/' . app(TenantContext::class)->id() . '/' . Str::uuid() . '.csv';
        Storage::disk('local')->put($caminho, $conteudo);

        $importacao = Importacao::create([
            'tipo' => $tipo, 'arquivo_nome' => Str::limit($arquivo->getClientOriginalName(), 250, ''), 'arquivo_caminho' => $caminho,
            'status' => 'previa', 'total' => $r['total'], 'validas' => $r['criadas'], 'ignoradas' => $r['ignoradas'], 'com_erro' => $r['erros'],
            'relatorio' => ['divergencias' => $r['divergencias'], 'avisos' => $r['avisos'], 'truncado' => $r['truncado']], 'criado_por' => $usuarioId,
        ]);
        $this->audit->record('transporte', 'importacao.previa', "importacao:{$importacao->id}", null, [
            'tipo' => $tipo, 'arquivo' => $importacao->arquivo_nome, 'total' => $r['total'], 'validas' => $r['criadas'], 'com_erro' => $r['erros'],
        ]);

        return $importacao;
    }

    /** Processa de verdade (chamado pelo job). O arquivo é apagado ao fim, com sucesso ou não. */
    public function processar(Importacao $importacao): void
    {
        $importacao->update(['status' => 'processando']);
        try {
            $conteudo = $importacao->arquivo_caminho !== null ? Storage::disk('local')->get($importacao->arquivo_caminho) : null;
            if ($conteudo === null) {
                throw new DomainException('O arquivo da importação não está mais disponível. Envie-o de novo.');
            }
            $r = $this->analisar($importacao->tipo, LeitorCsv::deTexto($conteudo), true);
            $importacao->update([
                'status' => 'concluida', 'total' => $r['total'], 'criadas' => $r['criadas'], 'ignoradas' => $r['ignoradas'], 'com_erro' => $r['erros'],
                'relatorio' => ['divergencias' => $r['divergencias'], 'avisos' => $r['avisos'], 'truncado' => $r['truncado']], 'concluida_em' => now(),
            ]);
            $this->audit->record('transporte', 'importacao.concluida', "importacao:{$importacao->id}", null, [
                'tipo' => $importacao->tipo, 'arquivo' => $importacao->arquivo_nome, 'usuario_id' => $importacao->criado_por,
                'total' => $r['total'], 'criadas' => $r['criadas'], 'ignoradas' => $r['ignoradas'], 'com_erro' => $r['erros'],
            ]);
        } catch (Throwable $e) {
            Log::warning('Importação do Transporte falhou', ['importacao' => $importacao->id, 'erro' => $e->getMessage()]);
            $importacao->update(['status' => 'falha', 'mensagem' => $e instanceof DomainException ? $e->getMessage() : 'Erro inesperado ao processar o arquivo.', 'concluida_em' => now()]);
        } finally {
            $this->apagarArquivo($importacao);
        }
    }

    public function apagarArquivo(Importacao $importacao): void
    {
        if ($importacao->arquivo_caminho !== null) {
            Storage::disk('local')->delete($importacao->arquivo_caminho);
            $importacao->update(['arquivo_caminho' => null]);
        }
    }

    /**
     * @return array{total: int, criadas: int, ignoradas: int, erros: int, divergencias: list<array{linha: int, codigo: string, mensagem: string}>, avisos: list<array{linha: int, mensagem: string}>, truncado: bool}
     */
    private function analisar(string $tipo, LeitorCsv $leitor, bool $gravar): array
    {
        $r = ['total' => 0, 'criadas' => 0, 'ignoradas' => 0, 'erros' => 0, 'divergencias' => [], 'avisos' => [], 'truncado' => false];
        $vistos = [];

        foreach ($leitor->linhas() as $numero => $linha) {
            $r['total']++;
            DB::beginTransaction();
            try {
                $ignorada = match ($tipo) {
                    'veiculos' => $this->veiculo($linha, $numero, $vistos),
                    'motoristas' => $this->motorista($linha, $numero, $vistos),
                    default => $this->parada($linha, $numero, $vistos),
                };
                $gravar ? DB::commit() : DB::rollBack();
                if ($ignorada !== null) {
                    $r['ignoradas']++;
                    $r['avisos'][] = ['linha' => $numero, 'mensagem' => $ignorada];
                } else {
                    $r['criadas']++;
                }
            } catch (Throwable $e) {
                DB::rollBack();
                $r['erros']++;
                if (count($r['divergencias']) < self::MAX_DIVERGENCIAS) {
                    $r['divergencias'][] = ['linha' => $numero, 'codigo' => $this->codigo($e), 'mensagem' => $this->mensagem($e)];
                } else {
                    $r['truncado'] = true;
                }
            }
        }

        return $r;
    }

    /**
     * @param array<string, string> $l
     * @param array<string, int> $vistos
     */
    private function veiculo(array $l, int $n, array &$vistos): null
    {
        $origem = Str::lower(Str::ascii($l['ORIGEM'] ?? ''));
        if (OrigemVeiculo::tryFrom($origem) === null) {
            throw new LinhaInvalida('origem_invalida', 'Origem inválida: use propria, locada ou terceirizada.');
        }
        $placa = VeiculoService::normalizarPlaca($l['PLACA'] ?? '');
        $this->exigirNaoRepetido($vistos, "placa:{$placa}", 'placa_repetida', "A placa {$placa} aparece mais de uma vez no arquivo");

        $capacidade = $this->inteiro($l['CAPACIDADE'] ?? '', 'CAPACIDADE');
        if ($capacidade === null || $capacidade < 1 || $capacidade > 500) {
            throw new LinhaInvalida('capacidade_invalida', 'A capacidade deve ser um número de 1 a 500.');
        }
        $tipologia = $this->inteiro($l['TIPOLOGIA_INEP'] ?? '', 'TIPOLOGIA_INEP');
        if ($tipologia === null || $tipologia < 1 || $tipologia > 11) {
            throw new LinhaInvalida('tipologia_invalida', 'A tipologia Inep deve ser de 1 a 11.');
        }
        $rede = Str::lower(Str::ascii($l['TIPO_REDE'] ?? ''));
        if (TipoRede::tryFrom($rede) === null) {
            throw new LinhaInvalida('tipo_rede_invalido', 'Tipo de rede inválido: use rural, urbana ou mista.');
        }
        $empresaId = $origem === 'propria' ? null : $this->empresaPorCnpj($l['CNPJ_EMPRESA'] ?? '');

        $this->veiculos->salvar(null, [
            'origem' => $origem, 'empresa_id' => $empresaId, 'descricao' => $l['DESCRICAO'] ?? '', 'placa' => $placa,
            'renavam' => $this->texto($l, 'RENAVAM'), 'chassi' => $this->texto($l, 'CHASSI'), 'marca_modelo' => $this->texto($l, 'MARCA_MODELO'),
            'ano_fabricacao' => $this->inteiro($l['ANO_FABRICACAO'] ?? '', 'ANO_FABRICACAO'), 'ano_modelo' => $this->inteiro($l['ANO_MODELO'] ?? '', 'ANO_MODELO'),
            'capacidade' => $capacidade, 'tipo_rede' => $rede, 'tipologia_inep' => $tipologia,
            'acessivel' => $this->booleano($l['ACESSIVEL'] ?? '', false), 'uso_exclusivo' => $this->booleano($l['USO_EXCLUSIVO'] ?? '', true),
            'observacoes' => $this->texto($l, 'OBSERVACOES'),
        ]);
        $vistos["placa:{$placa}"] = $n;

        return null;
    }

    /**
     * @param array<string, string> $l
     * @param array<string, int> $vistos
     */
    private function motorista(array $l, int $n, array &$vistos): null
    {
        $cpf = Documento::somenteDigitos($l['CPF'] ?? '');
        if (!Documento::valido($cpf)) {
            throw new LinhaInvalida('cpf_invalido', 'CPF inválido.');
        }
        $this->exigirNaoRepetido($vistos, "cpf:{$cpf}", 'cpf_repetido', 'O CPF aparece mais de uma vez no arquivo');
        $cnh = trim($l['CNH_NUMERO'] ?? '');
        $this->exigirNaoRepetido($vistos, "cnh:{$cnh}", 'cnh_repetida', 'A CNH aparece mais de uma vez no arquivo');

        $categoria = strtoupper(trim($l['CNH_CATEGORIA'] ?? ''));
        if (!in_array($categoria, ['D', 'E'], true)) {
            throw new LinhaInvalida('categoria_invalida', "CNH categoria {$categoria}: o transporte escolar exige categoria D ou E.");
        }
        $pessoa = Pessoa::query()->where('documento_hash', Documento::hash($cpf))->first();
        if ($pessoa === null || $pessoa->tipo !== 'fisica') {
            throw new LinhaInvalida('pessoa_nao_encontrada', 'Pessoa não encontrada no Cadastro de Pessoas: cadastre-a antes (a importação não cria pessoas).');
        }
        $validade = $this->data($l['CNH_VALIDADE'] ?? '', 'CNH_VALIDADE');
        if ($validade === null) {
            throw new LinhaInvalida('data_invalida', 'Informe a validade da CNH.');
        }

        $this->motoristas->salvar(null, [
            'pessoa_id' => $pessoa->id, 'empresa_id' => ($l['CNPJ_EMPRESA'] ?? '') !== '' ? $this->empresaPorCnpj($l['CNPJ_EMPRESA']) : null,
            'cnh_numero' => $cnh, 'cnh_categoria' => $categoria, 'cnh_validade' => $validade,
            'cnh_primeira_habilitacao' => $this->data($l['CNH_PRIMEIRA_HABILITACAO'] ?? '', 'CNH_PRIMEIRA_HABILITACAO'),
            'curso_certificado' => $this->texto($l, 'CURSO_CERTIFICADO'), 'curso_validade' => $this->data($l['CURSO_VALIDADE'] ?? '', 'CURSO_VALIDADE'),
            'toxicologico_data' => $this->data($l['TOXICOLOGICO_DATA'] ?? '', 'TOXICOLOGICO_DATA'),
            'toxicologico_validade' => $this->data($l['TOXICOLOGICO_VALIDADE'] ?? '', 'TOXICOLOGICO_VALIDADE'),
            'observacoes' => $this->texto($l, 'OBSERVACOES'),
        ]);
        $vistos["cpf:{$cpf}"] = $n;
        $vistos["cnh:{$cnh}"] = $n;

        return null;
    }

    /**
     * @param array<string, string> $l
     * @param array<string, int> $vistos
     * @return string|null aviso quando a parada é ignorada por já existir
     */
    private function parada(array $l, int $n, array &$vistos): ?string
    {
        $nome = trim($l['NOME'] ?? '');
        if ($nome === '') {
            throw new LinhaInvalida('nome_obrigatorio', 'Informe o nome da parada.');
        }
        $chave = $this->chaveDaParada($nome, $l['LOGRADOURO'] ?? '', $l['NUMERO'] ?? '');
        if (isset($vistos["parada:{$chave}"])) {
            return "Parada repetida no arquivo (igual à linha {$vistos["parada:{$chave}"]}): ignorada.";
        }
        $existe = Parada::query()->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])->get()
            ->contains(fn (Parada $p): bool => $this->chaveDaParada($p->nome, (string) $p->logradouro, (string) $p->numero) === $chave);
        if ($existe) {
            return 'Parada já cadastrada (mesmo nome, logradouro e número): ignorada.';
        }

        $lat = $this->decimal($l['LATITUDE'] ?? '', 'LATITUDE');
        $lng = $this->decimal($l['LONGITUDE'] ?? '', 'LONGITUDE');
        $this->paradas->salvar(null, [
            'nome' => $nome, 'latitude' => $lat, 'longitude' => $lng, 'cep' => $this->texto($l, 'CEP'), 'logradouro' => $this->texto($l, 'LOGRADOURO'),
            'numero' => $this->texto($l, 'NUMERO'), 'complemento' => $this->texto($l, 'COMPLEMENTO'), 'bairro' => $this->texto($l, 'BAIRRO'),
            'cidade' => $this->texto($l, 'CIDADE'), 'uf' => $this->texto($l, 'UF'), 'referencia' => $this->texto($l, 'REFERENCIA'), 'ativa' => true,
        ]);
        $vistos["parada:{$chave}"] = $n;

        return null;
    }

    private function chaveDaParada(string $nome, string $logradouro, string $numero): string
    {
        return Str::lower(Str::ascii(trim($nome))) . '|' . Str::lower(Str::ascii(trim($logradouro))) . '|' . Str::lower(trim($numero));
    }

    private function empresaPorCnpj(string $cnpj): int
    {
        $digitos = Documento::somenteDigitos($cnpj);
        if ($digitos === '') {
            throw new LinhaInvalida('empresa_obrigatoria', 'Informe o CNPJ da empresa (veículo locado ou terceirizado).');
        }
        $pessoa = Pessoa::query()->where('documento_hash', Documento::hash($digitos))->first();
        $empresa = $pessoa === null ? null : Empresa::query()->where('pessoa_id', $pessoa->id)->first();
        if ($empresa === null) {
            throw new LinhaInvalida('empresa_nao_encontrada', 'Empresa com esse CNPJ não está cadastrada no módulo.');
        }

        return $empresa->id;
    }

    /**
     * Só linhas aceitas entram em `$vistos`: uma linha recusada não ocupa a placa nem o CPF.
     *
     * @param array<string, int> $vistos
     */
    private function exigirNaoRepetido(array $vistos, string $chave, string $codigo, string $mensagem): void
    {
        if (isset($vistos[$chave])) {
            throw new LinhaInvalida($codigo, "{$mensagem} (primeira na linha {$vistos[$chave]}).");
        }
    }

    /** @param array<string, string> $l */
    private function texto(array $l, string $coluna): ?string
    {
        $v = trim($l[$coluna] ?? '');

        return $v === '' ? null : $v;
    }

    private function inteiro(string $v, string $coluna): ?int
    {
        $v = trim($v);
        if ($v === '') {
            return null;
        }
        if (preg_match('/^\d+$/', $v) !== 1) {
            throw new LinhaInvalida('numero_invalido', "{$coluna}: informe um número inteiro.");
        }

        return (int) $v;
    }

    private function decimal(string $v, string $coluna): ?float
    {
        $v = trim($v);
        if ($v === '') {
            return null;
        }
        $v = str_replace(',', '.', $v);
        if (!is_numeric($v)) {
            throw new LinhaInvalida('numero_invalido', "{$coluna}: informe um número.");
        }

        return (float) $v;
    }

    private function booleano(string $v, bool $padrao): bool
    {
        $v = Str::lower(Str::ascii(trim($v)));

        return match ($v) {
            '' => $padrao,
            'sim', 's', '1', 'true', 'x' => true,
            'nao', 'n', '0', 'false' => false,
            default => throw new LinhaInvalida('booleano_invalido', 'Use sim ou nao.'),
        };
    }

    /** `dd/mm/aaaa` ou `aaaa-mm-dd` → `aaaa-mm-dd`; vazio → `null`. */
    private function data(string $v, string $coluna): ?string
    {
        $v = trim($v);
        if ($v === '') {
            return null;
        }
        foreach (['d/m/Y', 'Y-m-d'] as $formato) {
            try {
                $data = Carbon::createFromFormat($formato, $v);
            } catch (Throwable) {
                continue;
            }
            if ($data instanceof Carbon && $data->format($formato) === $v) {
                return $data->toDateString();
            }
        }
        throw new LinhaInvalida('data_invalida', "{$coluna}: data inválida (use dd/mm/aaaa).");
    }

    private function exigirTipo(string $tipo): void
    {
        if (!in_array($tipo, self::TIPOS, true)) {
            throw new DomainException('Tipo de importação inválido.');
        }
    }

    private function codigo(Throwable $e): string
    {
        return match (true) {
            $e instanceof LinhaInvalida => $e->codigo,
            $e instanceof \Modules\Transporte\Support\ConflitoException => 'conflito',
            $e instanceof ValidationException, $e instanceof DomainException => 'invalida',
            default => 'erro_inesperado',
        };
    }

    private function mensagem(Throwable $e): string
    {
        if ($e instanceof ValidationException) {
            return implode(' ', array_map(fn (array $m): string => implode(' ', $m), $e->errors()));
        }
        if ($e instanceof DomainException) {
            return $e->getMessage();
        }
        Log::warning('Erro inesperado numa linha da importação do Transporte', ['erro' => $e->getMessage()]);

        return 'Erro inesperado ao processar a linha.';
    }
}

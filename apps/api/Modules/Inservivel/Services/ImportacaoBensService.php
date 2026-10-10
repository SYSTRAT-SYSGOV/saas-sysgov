<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Categoria;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Modules\OrgChart\Models\OrgUnit;
use SplFileObject;

/**
 * Importação da planilha patrimonial em CSV (D13; spec: Configurações e importação).
 *
 * Detecta `;` ou `,`, converte células que não são UTF-8 válido (ISO-8859-1) e identifica as colunas pelo cabeçalho
 * por apelido sem acento. O bem é criado ou atualizado pelo nº patrimonial; na atualização só os campos vazios são
 * preenchidos (como no PHP) e a situação e a unidade do bem não mudam. O centro de custo é casado com o Organograma
 * pelo nome ou sigla ("SMAD - DEPARTAMENTO DE PATRIMÔNIO" vira secretaria SMAD + setor Departamento de Patrimônio);
 * o que não casar vira pendência e a linha não é importada. Bens novos entram como `inservivel`.
 */
final class ImportacaoBensService
{
    use RegistraMutacao;

    private const BLOCO = 200;

    /** Apelidos normalizados de cada coluna (o primeiro que existir no cabeçalho vale). */
    private const APELIDOS = [
        'patrimonio' => ['cod tombamento', 'codigo tombamento', 'tombamento', 'numero patrimonial', 'n patrimonio', 'no patrimonio', 'num patrimonio', 'patrimonio'],
        'descricao' => ['complemento', 'descricao detalhada', 'descricao do bem', 'descricao', 'especificacao', 'bem', 'nome'],
        'centro_custo' => ['centro de custo descricao', 'centro de custo', 'centro custo', 'secretaria origem', 'secretaria', 'orgao'],
        'localizacao' => ['localizacao descricao', 'localizacao', 'descricao setor', 'setor', 'unidade'],
        'valor_contabil' => ['valor de aquisicao', 'valor aquisicao'],
        'valor_avaliado' => ['valor contabil', 'valor avaliado atual', 'valor avaliado'],
        'data_aquisicao' => ['data de aquisicao', 'data aquisicao', 'aquisicao'],
        'data_incorporacao' => ['data de incorporacao', 'data incorporacao', 'incorporacao'],
        'plaqueta_antiga' => ['plaqueta ant', 'plaqueta antiga', 'tombamento antigo', 'patrimonio antigo', 'cod tombamento antigo'],
        'numero_serie' => ['nro serie', 'nro de serie', 'n de serie', 'numero de serie', 'num serie', 'serie'],
        'categoria' => ['categoria', 'grupo', 'classe', 'tipo'],
        'marca' => ['marca', 'fabricante'],
        'modelo' => ['modelo'],
        'estado' => ['estado de conservacao', 'estado conservacao', 'conservacao', 'situacao fisica', 'estado'],
        'caracteristicas' => ['caracteristicas'],
    ];

    /** @var array<string, OrgUnit> nome/sigla normalizado => secretaria */
    private array $secretarias = [];

    /** @var list<OrgUnit> */
    private array $unidades = [];

    /** @var array<string, int> */
    private array $categorias = [];

    /** @var array<string, int> */
    private array $estados = [];

    /** @var array{categorias: int, estados: int} */
    private array $criadosParametros = ['categorias' => 0, 'estados' => 0];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ParametrosService $parametros,
        private readonly LotacaoService $lotacao,
    ) {}

    /**
     * @return array{criados: int, atualizados: int, sem_alteracao: int, pendencias: list<array{linha: int, patrimonio: string|null, motivo: string}>, categorias_criadas: int, estados_criados: int}
     */
    public function importar(string $caminho, User $autor): array
    {
        $this->carregarReferencias();
        $arquivo = new SplFileObject($caminho, 'r');
        $primeira = $this->limpar((string) $arquivo->fgets());
        $separador = substr_count($primeira, ';') > substr_count($primeira, ',') ? ';' : ',';
        $arquivo->rewind();
        $arquivo->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);
        $arquivo->setCsvControl($separador, '"', '');

        $colunas = null;
        $resultado = ['criados' => 0, 'atualizados' => 0, 'sem_alteracao' => 0, 'pendencias' => []];
        $bloco = [];
        $numeroLinha = 0;
        foreach ($arquivo as $linha) {
            $numeroLinha++;
            if (!is_array($linha) || $linha === [null]) {
                continue;
            }
            $linha = array_map(fn ($c): string => $this->limpar((string) $c), $linha);
            if ($colunas === null) {
                $colunas = $this->mapearCabecalho($linha);
                continue;
            }
            if (implode('', $linha) === '') {
                continue;
            }
            $bloco[] = [$numeroLinha, $linha];
            if (count($bloco) >= self::BLOCO) {
                $this->processarBloco($bloco, $colunas, $autor, $resultado);
                $bloco = [];
            }
        }
        if ($colunas === null) {
            throw new DomainException('A planilha está vazia.');
        }
        $this->processarBloco($bloco, $colunas, $autor, $resultado);

        $resumo = [...$resultado, 'categorias_criadas' => $this->criadosParametros['categorias'], 'estados_criados' => $this->criadosParametros['estados']];
        $this->audit->record('inservivel', 'importacao.concluida', 'importacao:bens', null, [
            'criados' => $resumo['criados'], 'atualizados' => $resumo['atualizados'], 'pendencias' => count($resumo['pendencias']), 'separador' => $separador,
        ]);

        return $resumo;
    }

    /**
     * @param list<array{0: int, 1: list<string>}> $bloco
     * @param array<string, int> $colunas
     * @param array{criados: int, atualizados: int, sem_alteracao: int, pendencias: list<array{linha: int, patrimonio: string|null, motivo: string}>} $resultado
     */
    private function processarBloco(array $bloco, array $colunas, User $autor, array &$resultado): void
    {
        if ($bloco === []) {
            return;
        }
        DB::transaction(function () use ($bloco, $colunas, $autor, &$resultado): void {
            foreach ($bloco as [$numero, $linha]) {
                $v = fn (string $campo): string => isset($colunas[$campo]) ? trim($linha[$colunas[$campo]] ?? '') : '';
                $patrimonio = $v('patrimonio');
                if ($patrimonio === '' || mb_strlen($patrimonio) > 50) {
                    $resultado['pendencias'][] = ['linha' => $numero, 'patrimonio' => $patrimonio === '' ? null : mb_substr($patrimonio, 0, 50), 'motivo' => 'Linha sem nº patrimonial válido.'];
                    continue;
                }
                [$secretaria, $setor] = $this->casarUnidade($v('centro_custo'), $v('localizacao'));
                if ($secretaria === null) {
                    $resultado['pendencias'][] = ['linha' => $numero, 'patrimonio' => $patrimonio, 'motivo' => 'Centro de custo não encontrado no Organograma: "' . ($v('centro_custo') ?: '(vazio)') . '".'];
                    continue;
                }
                $dados = array_filter([
                    'descricao' => $v('descricao') !== '' ? mb_substr($v('descricao'), 0, 5000) : null,
                    'plaqueta_antiga' => $v('plaqueta_antiga') !== '' ? mb_substr($v('plaqueta_antiga'), 0, 50) : null,
                    'numero_serie' => $v('numero_serie') !== '' ? mb_substr($v('numero_serie'), 0, 100) : null,
                    'marca' => $v('marca') !== '' ? mb_substr($v('marca'), 0, 100) : null,
                    'modelo' => $v('modelo') !== '' ? mb_substr($v('modelo'), 0, 100) : null,
                    'categoria_id' => $this->idParametro('categoria', $v('categoria')),
                    'estado_conservacao_id' => $this->idParametro('estado', $v('estado')),
                    'valor_contabil_cents' => self::centavos($v('valor_contabil')),
                    'valor_avaliado_cents' => self::centavos($v('valor_avaliado')),
                    'data_aquisicao' => self::data($v('data_aquisicao')),
                    'data_incorporacao' => self::data($v('data_incorporacao')),
                ], fn ($x): bool => $x !== null && $x !== 0);

                $existente = Bem::query()->where('numero_patrimonial', $patrimonio)->first();
                if ($existente === null) {
                    $observacoes = array_filter([
                        $setor === null && $v('localizacao') !== '' ? 'Localização: ' . $v('localizacao') : null,
                        $v('caracteristicas') !== '' ? 'Características: ' . $v('caracteristicas') : null,
                    ]);
                    $bem = Bem::query()->create([
                        'numero_patrimonial' => $patrimonio, 'descricao' => 'Bem patrimonial ' . $patrimonio, ...$dados,
                        'situacao_id' => $this->parametros->idDoPapel(PapelSituacao::Inservivel),
                        'secretaria_unit_id' => $secretaria->id, 'setor_unit_id' => $setor?->id,
                        'observacoes' => $observacoes === [] ? null : implode("\n", $observacoes), 'criado_por' => $autor->id,
                    ]);
                    $this->auditar('bem', 'importado', $bem->id, null, ['numero_patrimonial' => $patrimonio, 'linha' => $numero]);
                    $resultado['criados']++;
                    continue;
                }
                $preencher = [];
                foreach ($dados as $campo => $valor) {
                    $atual = $existente->getAttribute($campo);
                    if ($atual === null || $atual === '' || $atual === 0) {
                        $preencher[$campo] = $valor;
                    }
                }
                if ($preencher === []) {
                    $resultado['sem_alteracao']++;
                    continue;
                }
                $antes = $existente->only(array_keys($preencher));
                $existente->update($preencher);
                $this->auditar('bem', 'atualizado_importacao', $existente->id, $antes, $existente->only(array_keys($preencher)));
                $resultado['atualizados']++;
            }
        });
    }

    /** @return array{0: OrgUnit|null, 1: OrgUnit|null} secretaria e setor */
    private function casarUnidade(string $centroCusto, string $localizacao): array
    {
        $alvo = LotacaoService::normalizar($centroCusto);
        $secretaria = $this->secretarias[$alvo] ?? null;
        $setor = null;
        if ($secretaria === null && str_contains($centroCusto, ' - ')) {
            [$prefixo, $resto] = array_map('trim', explode(' - ', $centroCusto, 2));
            $secretaria = $this->secretarias[LotacaoService::normalizar($prefixo)] ?? null;
            $setor = $secretaria === null ? null : $this->unidadeAbaixo($secretaria, $resto);
        }
        if ($secretaria === null) {
            foreach ($this->unidades as $unidade) {
                if (LotacaoService::normalizar($unidade->name) === $alvo) {
                    $secretaria = $this->lotacao->secretariaDe($unidade);
                    $setor = $secretaria !== null && $secretaria->id !== $unidade->id ? $unidade : null;
                    break;
                }
            }
        }
        if ($secretaria !== null && $setor === null && $localizacao !== '') {
            $setor = $this->unidadeAbaixo($secretaria, $localizacao);
        }

        return [$secretaria, $setor];
    }

    private function unidadeAbaixo(OrgUnit $secretaria, string $nome): ?OrgUnit
    {
        $alvo = LotacaoService::normalizar($nome);
        foreach ($this->unidades as $unidade) {
            if (str_starts_with($unidade->path, $secretaria->path . '.')
                && (LotacaoService::normalizar($unidade->name) === $alvo || ($unidade->acronym !== null && LotacaoService::normalizar($unidade->acronym) === $alvo))) {
                return $unidade;
            }
        }

        return null;
    }

    private function idParametro(string $tipo, string $nome): ?int
    {
        $nome = trim(mb_substr($nome, 0, 120));
        if ($nome === '') {
            return null;
        }
        $mapa = $tipo === 'categoria' ? 'categorias' : 'estados';
        $chave = LotacaoService::normalizar($nome);
        if (!isset($this->{$mapa}[$chave])) {
            $classe = $tipo === 'categoria' ? Categoria::class : EstadoConservacao::class;
            $this->{$mapa}[$chave] = (int) $classe::query()->create(['nome' => mb_convert_case(mb_strtolower($nome), MB_CASE_TITLE)])->getKey();
            $this->criadosParametros[$mapa]++;
        }

        return $this->{$mapa}[$chave];
    }

    private function carregarReferencias(): void
    {
        $this->unidades = OrgUnit::query()->where('is_active', true)->get(['id', 'name', 'acronym', 'type', 'path', 'level'])->all();
        foreach ($this->unidades as $u) {
            if (in_array($u->type, LotacaoService::TIPOS_SECRETARIA, true)) {
                $this->secretarias[LotacaoService::normalizar($u->name)] = $u;
                if ($u->acronym !== null && $u->acronym !== '') {
                    $this->secretarias[LotacaoService::normalizar($u->acronym)] ??= $u;
                }
            }
        }
        foreach (Categoria::query()->get(['id', 'nome']) as $c) {
            $this->categorias[LotacaoService::normalizar((string) $c->getAttribute('nome'))] = (int) $c->getKey();
        }
        foreach (EstadoConservacao::query()->get(['id', 'nome']) as $e) {
            $this->estados[LotacaoService::normalizar((string) $e->getAttribute('nome'))] = (int) $e->getKey();
        }
    }

    /**
     * @param list<string> $cabecalho
     * @return array<string, int> campo => índice da coluna
     */
    private function mapearCabecalho(array $cabecalho): array
    {
        $normalizado = array_map(fn (string $c): string => self::chave($c), $cabecalho);
        $colunas = [];
        foreach (self::APELIDOS as $campo => $apelidos) {
            foreach ($apelidos as $apelido) {
                $indice = array_search($apelido, $normalizado, true);
                if ($indice !== false && !in_array($indice, $colunas, true)) {
                    $colunas[$campo] = (int) $indice;
                    break;
                }
            }
        }
        if (!isset($colunas['patrimonio'])) {
            throw new DomainException('Cabeçalho não reconhecido: a planilha precisa de uma coluna de nº patrimonial (ex.: "Cód. Tombamento" ou "Nº Patrimônio").');
        }

        return $colunas;
    }

    /** "Cód. Tombamento" → "cod tombamento"; "Nº Patrimônio" → "n patrimonio". */
    private static function chave(string $texto): string
    {
        $t = str_replace(['º', 'ª'], '', $texto);

        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', LotacaoService::normalizar($t)));
    }

    /** Remove BOM e caracteres de controle e converte para UTF-8 quando a célula não for UTF-8 válido. */
    private function limpar(string $valor): string
    {
        if (!mb_check_encoding($valor, 'UTF-8')) {
            $valor = mb_convert_encoding($valor, 'UTF-8', 'ISO-8859-1');
        }

        return trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|\x{FEFF}/u', '', $valor));
    }

    /** "R$ 1.500,46", "1,500.46", "72,46" e "72.46" em centavos inteiros, sem float. */
    public static function centavos(string $valor): int
    {
        $v = (string) preg_replace('/[^\d.,-]/', '', $valor);
        if ($v === '' || str_starts_with($v, '-')) {
            return 0;
        }
        $ultimoPonto = strrpos($v, '.');
        $ultimaVirgula = strrpos($v, ',');
        $decimal = null;
        if ($ultimoPonto !== false && $ultimaVirgula !== false) {
            $decimal = max($ultimoPonto, $ultimaVirgula);
        } elseif ($ultimaVirgula !== false) {
            $decimal = $ultimaVirgula;
        } elseif ($ultimoPonto !== false && (strlen($v) - $ultimoPonto - 1) !== 3) {
            $decimal = $ultimoPonto;
        }
        $inteiro = $decimal === null ? $v : substr($v, 0, $decimal);
        $fracao = $decimal === null ? '' : substr($v, $decimal + 1);
        $inteiro = (string) preg_replace('/\D/', '', $inteiro);
        $fracao = (string) preg_replace('/\D/', '', $fracao);
        $centavos = (int) str_pad(substr($fracao, 0, 2), 2, '0');
        if (strlen($fracao) > 2 && (int) $fracao[2] >= 5) {
            $centavos++;
        }

        return (int) $inteiro * 100 + $centavos;
    }

    private static function data(string $valor): ?string
    {
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})/', $valor, $m) && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $valor, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return "{$m[1]}-{$m[2]}-{$m[3]}";
        }

        return null;
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Censo\Importacao\CampoImportacao;
use Modules\Transporte\Censo\Importacao\Destinos;
use Modules\Transporte\Censo\Importacao\Educacenso2023;
use Modules\Transporte\Models\CensoLeiaute;
use Modules\Transporte\Support\ConflitoException;

/**
 * Leiaute de importação do Educacenso por órgão (design D-I2, no molde do CampoConfiguracaoService do Licita). Os campos
 * nativos vêm do código e o órgão ajusta posição, rótulo, ativo, mapa e formato; destino e chave nunca vêm do cliente.
 * Campo criado pelo órgão só pode guardar o valor como extra. "Excluir" um nativo é desativá-lo; excluir um personalizado
 * é tirá-lo da lista. Só o que difere do leiaute base fica salvo.
 */
final class LeiauteImportacaoService
{
    public const MAX_POSICAO = 300;

    public const MAX_PERSONALIZADOS = 60;

    public const FORMATOS_DATA = ['d/m/Y', 'Y-m-d', 'd/m/y', 'dmY'];

    public const CODIFICACOES = ['ISO-8859-1', 'UTF-8', 'Windows-1252'];

    private const AJUSTAVEIS = ['posicao', 'rotulo', 'ativo', 'mapa', 'formato', 'valor_verdadeiro'];

    public function __construct(private readonly AuditLogger $audit) {}

    /** O leiaute de fábrica do órgão, criado na primeira vez. */
    public function garantirPadrao(): CensoLeiaute
    {
        return CensoLeiaute::query()->where('padrao', true)->first()
            ?? CensoLeiaute::query()->firstOrCreate(['nome' => Educacenso2023::NOME], [
                'base' => Educacenso2023::CHAVE, 'ano_censo' => Educacenso2023::ANO, 'delimitador' => Educacenso2023::DELIMITADOR,
                'codificacao' => Educacenso2023::CODIFICACAO, 'campos' => [], 'padrao' => true,
            ]);
    }

    /** @return Collection<int, CensoLeiaute> */
    public function listar(): Collection
    {
        $this->garantirPadrao();

        return CensoLeiaute::query()->orderByDesc('padrao')->orderByDesc('ano_censo')->orderBy('nome')->get();
    }

    /**
     * Campos já mesclados (fábrica + ajustes do órgão + campos do órgão), por registro e posição.
     *
     * @return list<CampoImportacao>
     */
    public function campos(CensoLeiaute $leiaute, bool $apenasAtivos = false): array
    {
        $guardados = [];
        foreach ($leiaute->campos as $c) {
            $guardados[(string) ($c['chave'] ?? '')] = $c;
        }

        $campos = [];
        foreach (Educacenso2023::campos() as $base) {
            $ajuste = array_intersect_key($guardados[$base->chave] ?? [], array_flip(self::AJUSTAVEIS));
            if ($base->travado) {
                unset($ajuste['ativo']);
            }
            $campos[] = $base->com($ajuste);
            unset($guardados[$base->chave]);
        }
        foreach ($guardados as $chave => $c) {
            if (($c['nativo'] ?? true) === false) {
                $campos[] = (new CampoImportacao(
                    chave: (string) $chave, registro: (string) $c['registro'], posicao: (int) $c['posicao'], rotulo: (string) $c['rotulo'],
                    tipo: (string) $c['tipo'], destino: (string) $c['destino'], nativo: false,
                ))->com($c);
            }
        }

        usort($campos, static fn (CampoImportacao $a, CampoImportacao $b): int => [$a->registro, $a->posicao] <=> [$b->registro, $b->posicao]);

        return $apenasAtivos ? array_values(array_filter($campos, static fn (CampoImportacao $c): bool => $c->ativo)) : $campos;
    }

    /** @return array<string, mixed> */
    public function descrever(CensoLeiaute $leiaute, bool $comCampos = true): array
    {
        $dados = [
            'id' => $leiaute->id, 'nome' => $leiaute->nome, 'base' => $leiaute->base, 'ano_censo' => $leiaute->ano_censo,
            'delimitador' => $leiaute->delimitador, 'codificacao' => $leiaute->codificacao, 'padrao' => $leiaute->padrao,
        ];
        if (!$comCampos) {
            return $dados;
        }
        $fabrica = [];
        foreach (Educacenso2023::campos() as $c) {
            $fabrica[$c->chave] = $c;
        }
        $dados['campos'] = array_map(static function (CampoImportacao $c) use ($fabrica): array {
            $base = $fabrica[$c->chave] ?? null;

            return [...$c->paraArray(), 'posicao_padrao' => $base !== null ? $base->posicao : null, 'ativo_padrao' => $base !== null ? $base->ativo : true, 'registro_nome' => Destinos::REGISTROS[$c->registro] ?? $c->registro];
        }, $this->campos($leiaute));
        $dados['registros'] = Destinos::REGISTROS;
        $dados['formatos_data'] = self::FORMATOS_DATA;
        $dados['codificacoes'] = self::CODIFICACOES;

        return $dados;
    }

    /**
     * @param array<string, mixed> $dados nome, ano_censo, delimitador, codificacao e `campos` (lista de ajustes por chave;
     *        nativo omitido fica como está, personalizado omitido é excluído)
     */
    public function salvar(CensoLeiaute $leiaute, array $dados): CensoLeiaute
    {
        return DB::transaction(function () use ($leiaute, $dados): CensoLeiaute {
            $cabecalho = $this->cabecalho($leiaute, $dados);
            $recebidos = is_array($dados['campos'] ?? null) ? $dados['campos'] : null;
            $alterados = [];
            $guardar = $leiaute->campos;

            if ($recebidos !== null) {
                [$guardar, $alterados] = $this->montarCampos($leiaute, $recebidos);
            }

            $novo = (clone $leiaute)->forceFill([...$cabecalho, 'campos' => $guardar]);
            $this->exigirPosicoesDistintas($this->campos($novo, true));

            $leiaute->update([...$cabecalho, 'campos' => $guardar]);
            $this->audit->record('transporte', 'censo_leiaute.salvo', "censo_leiaute:{$leiaute->id}", null, ['leiaute' => $leiaute->nome, 'campos_alterados' => $alterados]);

            return $leiaute->refresh();
        });
    }

    public function duplicar(CensoLeiaute $origem, string $nome, int $ano): CensoLeiaute
    {
        $nome = trim($nome);
        if ($nome === '' || mb_strlen($nome) > 100) {
            throw new DomainException('Informe um nome de até 100 caracteres para o leiaute.');
        }
        if (CensoLeiaute::query()->where('nome', $nome)->exists()) {
            throw new ConflitoException("Já existe um leiaute chamado \"{$nome}\".");
        }

        $copia = CensoLeiaute::query()->create([
            'nome' => $nome, 'base' => $origem->base, 'ano_censo' => $ano, 'delimitador' => $origem->delimitador,
            'codificacao' => $origem->codificacao, 'campos' => $origem->campos, 'padrao' => false,
        ]);
        $this->audit->record('transporte', 'censo_leiaute.duplicado', "censo_leiaute:{$copia->id}", null, ['origem' => $origem->nome, 'leiaute' => $nome]);

        return $copia;
    }

    /** Descarta os ajustes e os campos do órgão: volta ao leiaute de fábrica. */
    public function restaurar(CensoLeiaute $leiaute): CensoLeiaute
    {
        $leiaute->update(['campos' => []]);
        $this->audit->record('transporte', 'censo_leiaute.restaurado', "censo_leiaute:{$leiaute->id}", null, ['leiaute' => $leiaute->nome]);

        return $leiaute->refresh();
    }

    public function definirPadrao(CensoLeiaute $leiaute): CensoLeiaute
    {
        DB::transaction(function () use ($leiaute): void {
            CensoLeiaute::query()->where('padrao', true)->update(['padrao' => false]);
            $leiaute->update(['padrao' => true]);
        });
        $this->audit->record('transporte', 'censo_leiaute.padrao', "censo_leiaute:{$leiaute->id}", null, ['leiaute' => $leiaute->nome]);

        return $leiaute->refresh();
    }

    public function excluir(CensoLeiaute $leiaute): void
    {
        if ($leiaute->padrao) {
            throw new ConflitoException('O leiaute padrão não pode ser excluído. Defina outro como padrão antes.');
        }
        $this->audit->record('transporte', 'censo_leiaute.excluido', "censo_leiaute:{$leiaute->id}", ['leiaute' => $leiaute->nome], null);
        $leiaute->delete();
    }

    /**
     * @param array<string, mixed> $dados
     * @return array{nome: string, ano_censo: int, delimitador: string, codificacao: string}
     */
    private function cabecalho(CensoLeiaute $leiaute, array $dados): array
    {
        $nome = trim((string) ($dados['nome'] ?? $leiaute->nome));
        if ($nome === '' || mb_strlen($nome) > 100) {
            throw new DomainException('Informe um nome de até 100 caracteres para o leiaute.');
        }
        if (CensoLeiaute::query()->where('nome', $nome)->whereKeyNot($leiaute->id)->exists()) {
            throw new ConflitoException("Já existe um leiaute chamado \"{$nome}\".");
        }
        $ano = (int) ($dados['ano_censo'] ?? $leiaute->ano_censo);
        if ($ano < 2000 || $ano > 2100) {
            throw new DomainException('Informe o ano do Censo com quatro dígitos.');
        }
        $delimitador = (string) ($dados['delimitador'] ?? $leiaute->delimitador);
        if (mb_strlen($delimitador) !== 1 || ctype_alnum($delimitador) || $delimitador === '"') {
            throw new DomainException('O delimitador deve ser um único caractere que não seja letra, número nem aspas.');
        }
        $codificacao = (string) ($dados['codificacao'] ?? $leiaute->codificacao);
        if (!in_array($codificacao, self::CODIFICACOES, true)) {
            throw new DomainException('Codificação inválida. Use ' . implode(', ', self::CODIFICACOES) . '.');
        }

        return ['nome' => $nome, 'ano_censo' => $ano, 'delimitador' => $delimitador, 'codificacao' => $codificacao];
    }

    /**
     * @param array<int|string, mixed> $recebidos
     * @return array{0: list<array<string, mixed>>, 1: list<string>} campos a guardar e chaves alteradas
     */
    private function montarCampos(CensoLeiaute $leiaute, array $recebidos): array
    {
        $fabrica = [];
        foreach (Educacenso2023::campos() as $c) {
            $fabrica[$c->chave] = $c;
        }
        $antes = [];
        foreach ($this->campos($leiaute) as $c) {
            $antes[$c->chave] = $c->paraArray();
        }

        $guardar = [];
        $vistas = [];
        $alterados = [];
        $personalizados = 0;

        foreach ($recebidos as $entrada) {
            if (!is_array($entrada)) {
                throw new DomainException('Lista de campos inválida.');
            }
            $chave = $entrada['chave'] ?? null;
            if (!is_string($chave) || $chave === '') {
                throw new DomainException('Todo campo precisa de uma chave.');
            }
            if (isset($vistas[$chave])) {
                throw new DomainException("Chave de campo repetida: {$chave}.");
            }
            $vistas[$chave] = true;

            if (isset($fabrica[$chave])) {
                $ajuste = $this->ajusteNativo($fabrica[$chave], $entrada);
                if ($ajuste !== []) {
                    $guardar[] = ['chave' => $chave, ...$ajuste];
                }
                $depois = $fabrica[$chave]->com($ajuste)->paraArray();
            } else {
                if (++$personalizados > self::MAX_PERSONALIZADOS) {
                    throw new DomainException('Limite de ' . self::MAX_PERSONALIZADOS . ' campos personalizados.');
                }
                $campo = $this->campoPersonalizado($chave, $entrada);
                $guardar[] = $campo;
                $depois = (new CampoImportacao($chave, $campo['registro'], $campo['posicao'], $campo['rotulo'], $campo['tipo'], $campo['destino'], nativo: false))->com($campo)->paraArray();
            }
            if (($antes[$chave] ?? null) !== $depois) {
                $alterados[] = $chave;
            }
        }

        // Nativo que o cliente não mandou fica como estava.
        foreach ($leiaute->campos as $c) {
            $k = (string) ($c['chave'] ?? '');
            if (isset($fabrica[$k]) && !isset($vistas[$k])) {
                $guardar[] = $c;
            }
        }
        // Personalizado que sumiu da lista foi excluído.
        foreach ($leiaute->campos as $c) {
            $k = (string) ($c['chave'] ?? '');
            if (!isset($fabrica[$k]) && !isset($vistas[$k])) {
                $alterados[] = $k;
            }
        }

        return [$guardar, array_values(array_unique($alterados))];
    }

    /**
     * @param array<string, mixed> $entrada
     * @return array<string, mixed> só o que difere do campo de fábrica
     */
    private function ajusteNativo(CampoImportacao $base, array $entrada): array
    {
        $ajuste = [];
        if (array_key_exists('posicao', $entrada) && $this->posicao($entrada['posicao'], $base->rotulo) !== $base->posicao) {
            $ajuste['posicao'] = $this->posicao($entrada['posicao'], $base->rotulo);
        }
        if (array_key_exists('rotulo', $entrada) && $this->rotulo($entrada['rotulo']) !== $base->rotulo) {
            $ajuste['rotulo'] = $this->rotulo($entrada['rotulo']);
        }
        if (array_key_exists('ativo', $entrada)) {
            $ativo = (bool) $entrada['ativo'];
            if ($base->travado && !$ativo) {
                throw new DomainException("O campo \"{$base->rotulo}\" é necessário para conciliar os dados do aluno e não pode ser desativado.");
            }
            if ($ativo !== $base->ativo) {
                $ajuste['ativo'] = $ativo;
            }
        }
        if (array_key_exists('mapa', $entrada) && $base->tipo === 'codigo') {
            $mapa = $this->mapa($entrada['mapa']);
            if ($mapa !== $base->mapa) {
                $ajuste['mapa'] = $mapa ?? [];
            }
        }
        if (array_key_exists('formato', $entrada) && $base->tipo === 'data' && $this->formato($entrada['formato']) !== $base->formato) {
            $ajuste['formato'] = $this->formato($entrada['formato']);
        }
        if (array_key_exists('valor_verdadeiro', $entrada) && $base->tipo === 'booleano') {
            $v = trim((string) $entrada['valor_verdadeiro']);
            if ($v === '' || mb_strlen($v) > 10) {
                throw new DomainException('O valor que significa "sim" deve ter de 1 a 10 caracteres.');
            }
            if ($v !== $base->valorVerdadeiro) {
                $ajuste['valor_verdadeiro'] = $v;
            }
        }

        return $ajuste;
    }

    /**
     * @param array<string, mixed> $e
     * @return array{chave: string, nativo: false, registro: string, posicao: int, rotulo: string, tipo: string, destino: string, ativo: bool, sensivel: bool, mapa: array<string, string>|null, formato: string, valor_verdadeiro: string}
     */
    private function campoPersonalizado(string $chave, array $e): array
    {
        if (preg_match('/^[a-z][a-z0-9_]{1,39}$/', $chave) !== 1) {
            throw new DomainException("Chave inválida \"{$chave}\": use letras minúsculas, números e sublinhado, começando por letra (2 a 40 caracteres).");
        }
        $registro = (string) ($e['registro'] ?? '');
        if (!isset(Destinos::EXTRA_POR_REGISTRO[$registro])) {
            throw new DomainException('Registro inválido para o campo "' . $chave . '". Use ' . implode(', ', array_keys(Destinos::REGISTROS)) . '.');
        }
        $tipo = (string) ($e['tipo'] ?? '');
        if (!in_array($tipo, CampoImportacao::TIPOS, true)) {
            throw new DomainException("Tipo inválido para o campo \"{$chave}\".");
        }
        $rotulo = $this->rotulo($e['rotulo'] ?? '');
        $verdadeiro = trim((string) ($e['valor_verdadeiro'] ?? '1'));
        if ($verdadeiro === '' || mb_strlen($verdadeiro) > 10) {
            throw new DomainException('O valor que significa "sim" deve ter de 1 a 10 caracteres.');
        }

        return [
            'chave' => $chave, 'nativo' => false, 'registro' => $registro, 'posicao' => $this->posicao($e['posicao'] ?? null, $rotulo),
            'rotulo' => $rotulo, 'tipo' => $tipo, 'destino' => Destinos::EXTRA_POR_REGISTRO[$registro],
            'ativo' => (bool) ($e['ativo'] ?? true), 'sensivel' => (bool) ($e['sensivel'] ?? false),
            'mapa' => $tipo === 'codigo' ? $this->mapa($e['mapa'] ?? null) : null,
            'formato' => $this->formato($e['formato'] ?? 'd/m/Y'), 'valor_verdadeiro' => $verdadeiro,
        ];
    }

    private function posicao(mixed $valor, string $rotulo): int
    {
        if (!is_int($valor) && !(is_string($valor) && ctype_digit($valor))) {
            throw new DomainException("Informe a posição (coluna) do campo \"{$rotulo}\".");
        }
        $p = (int) $valor;
        if ($p < 1 || $p > self::MAX_POSICAO) {
            throw new DomainException("A posição do campo \"{$rotulo}\" deve ficar entre 1 e " . self::MAX_POSICAO . '. A coluna 0 é o tipo do registro.');
        }

        return $p;
    }

    private function rotulo(mixed $valor): string
    {
        $r = trim((string) $valor);
        if ($r === '' || mb_strlen($r) > 100) {
            throw new DomainException('O rótulo do campo deve ter de 1 a 100 caracteres.');
        }

        return $r;
    }

    private function formato(mixed $valor): string
    {
        $f = (string) $valor;
        if (!in_array($f, self::FORMATOS_DATA, true)) {
            throw new DomainException('Formato de data inválido. Use ' . implode(', ', self::FORMATOS_DATA) . '.');
        }

        return $f;
    }

    /** @return array<string, string>|null */
    private function mapa(mixed $valor): ?array
    {
        if ($valor === null || $valor === [] || $valor === '') {
            return null;
        }
        if (!is_array($valor) || count($valor) > 100) {
            throw new DomainException('O mapa de códigos aceita até 100 itens.');
        }
        $mapa = [];
        foreach ($valor as $codigo => $rotulo) {
            $codigo = trim((string) $codigo);
            $rotulo = trim((string) $rotulo);
            if ($codigo === '' || mb_strlen($codigo) > 20 || $rotulo === '' || mb_strlen($rotulo) > 100) {
                throw new DomainException('Cada item do mapa precisa de código (até 20 caracteres) e rótulo (até 100).');
            }
            $mapa[$codigo] = $rotulo;
        }

        return $mapa;
    }

    /** @param list<CampoImportacao> $ativos */
    private function exigirPosicoesDistintas(array $ativos): void
    {
        $ocupadas = [];
        foreach ($ativos as $c) {
            $chave = $c->registro . ':' . $c->posicao;
            if (isset($ocupadas[$chave])) {
                throw new DomainException("Os campos \"{$ocupadas[$chave]}\" e \"{$c->rotulo}\" estão na mesma posição ({$c->posicao}) do Registro {$c->registro}.");
            }
            $ocupadas[$chave] = $c->rotulo;
        }
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Modules\Transporte\Custo\CalculadoraCustoRota;
use Modules\Transporte\Custo\Parametros;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Support\Csv;

/**
 * Custo de uma rota a partir dos dados do cadastro (veículo, percurso, alunos) e dos parâmetros do ano da rota
 * (design D-C1 a D-C6). O modal vem da tipologia do veículo: 7 a 10 é aquaviário, os demais são rodoviários.
 */
final class CustoRotaService
{
    public function __construct(private readonly CustoParametroService $parametros, private readonly AuditLogger $audit) {}

    /**
     * @param array<string, mixed> $ajustes parâmetros trocados só nesta conta (simulação); não são salvos
     * @param array<string, float>|null $valoresDoAno parâmetros já carregados (evita reler a cada rota)
     * @return array<string, mixed>
     */
    public function calcular(Rota $rota, array $ajustes = [], ?array $valoresDoAno = null): array
    {
        $rota->loadMissing(['escola', 'empresa.pessoa', 'veiculo.empresa.pessoa']);
        $veiculo = $rota->veiculo;
        $alunos = (int) ($rota->getAttribute('alocacoes_ativas_count') ?? $rota->alocacoes()->whereNull('data_fim')->count());
        $km = (float) $rota->km_pavimentado + (float) $rota->km_nao_pavimentado;

        $cabecalho = [
            'rota_id' => $rota->id, 'rota' => $rota->nome, 'ano_letivo' => $rota->ano_letivo, 'turno' => $rota->turno,
            'escola' => $rota->escola?->nome, 'escola_id' => $rota->escola_id,
            'empresa' => ($rota->empresa ?? $veiculo?->empresa)?->nome(), 'empresa_id' => $rota->empresa_id ?? $veiculo?->empresa_id,
            'veiculo' => $veiculo?->placa, 'origem_veiculo' => $veiculo?->origem,
            'custo_contratado_mensal' => $rota->custo_contratado_mensal !== null ? (float) $rota->custo_contratado_mensal : null,
            'simulado' => $ajustes !== [],
        ];

        if ($veiculo === null) {
            return [...$cabecalho, 'modal' => null, 'completo' => false, 'faltando' => [['chave' => 'veiculo', 'rotulo' => 'Veículo da rota']],
                'km_viagem' => $km, 'alunos' => $alunos, 'comparativo' => null];
        }

        $escopo = $veiculo->tipologia_inep >= 7 && $veiculo->tipologia_inep <= 10 ? 'aqua' : 'rod';
        $parametros = [...($valoresDoAno ?? $this->parametros->valores($rota->ano_letivo)), ...$this->validarAjustes($ajustes)];
        $idade = $veiculo->ano_fabricacao !== null ? max(0, $rota->ano_letivo - (int) $veiculo->ano_fabricacao) : null;
        $r = CalculadoraCustoRota::calcular($escopo, $parametros, $km, $alunos, $idade);

        return [...$cabecalho, 'modal' => $escopo === 'aqua' ? 'aquaviario' : 'rodoviario', ...$r, 'comparativo' => $this->comparar($rota, $r['custo_mensal'], $parametros)];
    }

    /**
     * @param array<string, mixed> $filtros escola_id, empresa_id, modal
     * @return list<array<string, mixed>>
     */
    public function listar(int $ano, array $filtros = []): array
    {
        $valores = $this->parametros->valores($ano);
        /** @var Collection<int, Rota> $rotas */
        $rotas = Rota::query()->with(['escola', 'empresa.pessoa', 'veiculo.empresa.pessoa'])
            ->withCount(['alocacoes as alocacoes_ativas_count' => fn ($q) => $q->whereNull('data_fim')])
            ->where('ano_letivo', $ano)
            ->when($filtros['escola_id'] ?? null, fn ($q, $v) => $q->where('escola_id', $v))
            ->orderBy('nome')->get();

        $linhas = [];
        foreach ($rotas as $rota) {
            $linha = $this->calcular($rota, [], $valores);
            if (isset($filtros['empresa_id']) && $linha['empresa_id'] !== (int) $filtros['empresa_id']) {
                continue;
            }
            if (isset($filtros['modal']) && $linha['modal'] !== $filtros['modal']) {
                continue;
            }
            $linhas[] = $linha;
        }

        return $linhas;
    }

    /**
     * Linhas por rota e totais por escola e por empresa (só rotas com cálculo completo entram nos totais).
     *
     * @param array<string, mixed> $filtros
     * @return array{ano_letivo: int, linhas: list<array<string, mixed>>, por_escola: list<array<string, mixed>>, por_empresa: list<array<string, mixed>>, totais: array<string, mixed>}
     */
    public function relatorio(int $ano, array $filtros = []): array
    {
        $linhas = $this->listar($ano, $filtros);

        return [
            'ano_letivo' => $ano, 'linhas' => $linhas,
            'por_escola' => $this->agrupar($linhas, 'escola_id', 'escola'),
            'por_empresa' => $this->agrupar($linhas, 'empresa_id', 'empresa'),
            'totais' => $this->totais($linhas),
        ];
    }

    /** @param array<string, mixed> $filtros */
    public function csv(int $ano, array $filtros = []): string
    {
        $linhas = $this->listar($ano, $filtros);
        $saida = Csv::BOM . Csv::linha([
            'Rota', 'Escola', 'Ano letivo', 'Turno', 'Modal', 'Veículo', 'Origem do veículo', 'Empresa', 'Km do percurso', 'Alunos', 'Cálculo',
            'Custo mensal (R$)', 'Custo anual (R$)', 'Custo por km (R$)', 'Custo por aluno no mês (R$)', 'Custo por aluno no ano (R$)',
            'Contratado por mês (R$)', 'Diferença contratado - estimado (R$)', 'Falta informar',
        ]);
        $n = fn (?float $v): ?string => $v === null ? null : number_format($v, 2, ',', '');
        foreach ($linhas as $l) {
            $saida .= Csv::linha([
                $l['rota'], $l['escola'], $l['ano_letivo'], $l['turno'], $l['modal'], $l['veiculo'], $l['origem_veiculo'], $l['empresa'],
                $n($l['km_viagem']), $l['alunos'], $l['completo'] ? 'completo' : 'incompleto',
                $n($l['custo_mensal'] ?? null), $n($l['custo_anual'] ?? null), $n($l['custo_por_km'] ?? null), $n($l['custo_por_aluno_mes'] ?? null), $n($l['custo_por_aluno_ano'] ?? null),
                $n($l['custo_contratado_mensal']), $n($l['comparativo']['diferenca'] ?? null),
                implode(', ', array_column($l['faltando'], 'rotulo')),
            ]);
        }
        $this->audit->record('transporte', 'custos.exportado', "custos:{$ano}", null, ['ano_letivo' => $ano, 'linhas' => count($linhas), 'filtros' => $filtros]);

        return $saida;
    }

    /**
     * @param array<string, mixed> $ajustes
     * @return array<string, float>
     */
    private function validarAjustes(array $ajustes): array
    {
        $catalogo = Parametros::porChave();
        $validos = [];
        foreach ($ajustes as $chave => $bruto) {
            $def = $catalogo[$chave] ?? throw new DomainException("Parâmetro desconhecido: {$chave}.");
            $texto = is_string($bruto) ? str_replace(',', '.', trim($bruto)) : $bruto;
            if (!is_numeric($texto) || (float) $texto < $def['min'] || (float) $texto > $def['max']) {
                throw new DomainException("Valor inválido para \"{$def['rotulo']}\" na simulação.");
            }
            $validos[$chave] = (float) $texto;
        }

        return $validos;
    }

    /**
     * @param array<string, float> $parametros
     * @return array{contratado: float, estimado: float, diferenca: float, percentual: float|null, acima_do_limite: bool}|null
     */
    private function comparar(Rota $rota, ?float $estimado, array $parametros): ?array
    {
        if ($rota->custo_contratado_mensal === null || $estimado === null) {
            return null;
        }
        $contratado = (float) $rota->custo_contratado_mensal;
        $diferenca = round($contratado - $estimado, 2);
        $percentual = $estimado > 0 ? round($diferenca / $estimado * 100, 1) : null;

        return [
            'contratado' => $contratado, 'estimado' => $estimado, 'diferenca' => $diferenca, 'percentual' => $percentual,
            'acima_do_limite' => $percentual !== null && $percentual > ($parametros['contrato_limite_pct'] ?? 10.0),
        ];
    }

    /**
     * @param list<array<string, mixed>> $linhas
     * @return list<array<string, mixed>>
     */
    private function agrupar(array $linhas, string $chaveId, string $chaveNome): array
    {
        /** @var array<int|string, array{id: mixed, nome: mixed, rotas: int, incompletas: int, alunos: int, custo_anual: float}> $grupos */
        $grupos = [];
        foreach ($linhas as $l) {
            $id = $l[$chaveId] ?? 0;
            $grupos[$id] ??= ['id' => $l[$chaveId], 'nome' => $l[$chaveNome] ?? 'Sem ' . $chaveNome, 'rotas' => 0, 'incompletas' => 0, 'alunos' => 0, 'custo_anual' => 0.0];
            $grupos[$id]['rotas']++;
            if ($l['completo']) {
                $grupos[$id]['alunos'] += $l['alunos'];
                $grupos[$id]['custo_anual'] += (float) $l['custo_anual'];
            } else {
                $grupos[$id]['incompletas']++;
            }
        }
        $saida = [];
        foreach ($grupos as $g) {
            $g['custo_anual'] = round($g['custo_anual'], 2);
            $g['custo_por_aluno_ano'] = $g['alunos'] > 0 ? round($g['custo_anual'] / $g['alunos'], 2) : null;
            $saida[] = $g;
        }
        usort($saida, static fn (array $a, array $b): int => strcmp((string) $a['nome'], (string) $b['nome']));

        return $saida;
    }

    /**
     * @param list<array<string, mixed>> $linhas
     * @return array<string, mixed>
     */
    private function totais(array $linhas): array
    {
        $completas = array_filter($linhas, static fn (array $l): bool => $l['completo']);
        $anual = array_sum(array_map(static fn (array $l): float => (float) $l['custo_anual'], $completas));
        $alunos = array_sum(array_map(static fn (array $l): int => $l['alunos'], $completas));

        return [
            'rotas' => count($linhas), 'completas' => count($completas), 'incompletas' => count($linhas) - count($completas),
            'custo_anual' => round($anual, 2), 'alunos' => $alunos, 'custo_por_aluno_ano' => $alunos > 0 ? round($anual / $alunos, 2) : null,
        ];
    }
}

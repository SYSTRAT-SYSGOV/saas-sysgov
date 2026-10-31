<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\Veiculo;

/** Painel do módulo (design D33): tudo calculado na hora, sem tabela própria. */
final class PainelService
{
    public function __construct(private readonly AlertaService $alertas) {}

    /** @return array<string, mixed> */
    public function montar(?int $ano): array
    {
        $rotas = Rota::query()->with(['escola', 'veiculo'])->where('ativa', true)
            ->withCount(['alocacoes as alocados' => fn ($q) => $q->whereNull('data_fim')])
            ->when($ano, fn ($q) => $q->where('ano_letivo', $ano))->get();

        $itens = $rotas->map(function (Rota $r): array {
            $o = OcupacaoService::calcular((int) $r->getAttribute('alocados'), $r->veiculo?->capacidade);

            return [
                'id' => $r->id, 'nome' => $r->nome, 'escola' => $r->escola?->nome, 'turno' => $r->turno, 'placa' => $r->veiculo?->placa,
                'ocupacao' => $o, 'pendencia' => $o['calculavel'] ? null : 'rota_sem_veiculo',
            ];
        });
        $ordem = ['vermelho' => 0, 'amarelo' => 2, 'verde' => 3];
        $lista = $itens->sortBy(fn (array $i): string => sprintf('%d|%08.3f|%s', $i['pendencia'] !== null ? 1 : $ordem[$i['ocupacao']['faixa']], 1000 - ($i['ocupacao']['percentual'] ?? 0), $i['nome']))->values();

        $comVeiculo = $itens->filter(fn (array $i): bool => $i['ocupacao']['calculavel']);
        $capacidade = (int) $comVeiculo->sum(fn (array $i): int => (int) $i['ocupacao']['capacidade']);
        $alocados = (int) $comVeiculo->sum(fn (array $i): int => $i['ocupacao']['alocados']);

        $alunos = Alocacao::query()->whereNull('data_fim')->whereHas('rota', fn ($q) => $q->where('ativa', true)->when($ano, fn ($w) => $w->where('ano_letivo', $ano)))
            ->distinct()->count('aluno_id');
        $a = $this->alertas->listar();

        return [
            'ano_letivo' => $ano,
            'indicadores' => [
                'rotas_ativas' => $rotas->count(),
                'veiculos_ativos' => Veiculo::query()->where('ativo', true)->count(),
                'alunos_transportados' => $alunos,
                'ocupacao_media' => $capacidade > 0 ? round($alocados * 100 / $capacidade, 1) : null,
                'rotas_superlotadas' => $itens->filter(fn (array $i): bool => $i['ocupacao']['faixa'] === 'vermelho')->count(),
                'rotas_sem_veiculo' => $itens->filter(fn (array $i): bool => $i['pendencia'] !== null)->count(),
            ],
            'rotas' => $lista,
            'alertas' => ['data' => $a, 'resumo' => [
                'criticos' => count(array_filter($a, fn (array $x): bool => $x['gravidade'] === 'critico')),
                'atencao' => count(array_filter($a, fn (array $x): bool => $x['gravidade'] !== 'critico')),
            ]],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;

/**
 * Adoção do cadastro central por módulo (unificar-cadastro-pessoas): quantos registros já referenciam uma
 * pessoa, quantos não, quantos dependem de documento pendente e quantas divergências estão abertas. Só totais.
 */
final class AdocaoPessoaService
{
    public function __construct(private readonly ConciliacaoRegistry $registry) {}

    /**
     * @return array{modulos: list<array{modulo: string, tabela: string, total: int, vinculados: int, sem_vinculo: int, documento_pendente: int, divergencias_abertas: int}>, totais: array<string, int>}
     */
    public function relatorio(): array
    {
        $modulos = [];
        foreach ($this->registry->aliases() as $alias) {
            $modulos[] = $this->doModulo($alias);
        }

        $totais = ['total' => 0, 'vinculados' => 0, 'sem_vinculo' => 0, 'documento_pendente' => 0, 'divergencias_abertas' => 0];
        foreach ($modulos as $m) {
            foreach (array_keys($totais) as $chave) {
                $totais[$chave] += $m[$chave];
            }
        }

        return ['modulos' => $modulos, 'totais' => $totais];
    }

    /** @return array{modulo: string, tabela: string, total: int, vinculados: int, sem_vinculo: int, documento_pendente: int, divergencias_abertas: int} */
    private function doModulo(string $alias): array
    {
        $modulo = $this->registry->obter($alias);
        $total = 0;
        $pessoaIds = [];
        foreach ($modulo->registros() as $registro) {
            $total++;
            if ($registro->pessoaId !== null) {
                $pessoaIds[] = $registro->pessoaId;
            }
        }

        $pendentes = $pessoaIds === [] ? 0 : Pessoa::query()->whereIn('id', array_unique($pessoaIds))->where('documento_pendente', true)->count();

        return [
            'modulo' => $alias,
            'tabela' => $modulo->tabela(),
            'total' => $total,
            'vinculados' => count($pessoaIds),
            'sem_vinculo' => $total - count($pessoaIds),
            'documento_pendente' => $pendentes,
            'divergencias_abertas' => PessoaDivergencia::query()->abertas()->where('modulo', $alias)->count(),
        ];
    }
}

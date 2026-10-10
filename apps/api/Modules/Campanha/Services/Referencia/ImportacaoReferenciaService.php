<?php

declare(strict_types=1);

namespace Modules\Campanha\Services\Referencia;

use Modules\Campanha\Models\Referencia\RefImportacao;
use Throwable;

/**
 * Importação completa da base pública de uma UF (D4): cada fonte roda à parte — a falha de uma não
 * derruba as outras — e o resultado (contagens, não associados, erros) fica em campanha_ref_importacoes.
 * Nunca toca os dados das campanhas.
 */
final class ImportacaoReferenciaService
{
    public function __construct(
        private readonly ImportadorIbge $ibge,
        private readonly ImportadorTse $tse,
    ) {}

    /** @param (callable(string): void)|null $informar */
    public function importar(string $uf, int $eleicao, ?int $anoEleitorado = null, ?callable $informar = null): RefImportacao
    {
        $uf = strtoupper($uf);
        UnidadesFederativas::codigo($uf);
        $registro = RefImportacao::create(['uf' => $uf, 'situacao' => 'em_andamento', 'iniciado_em' => now()]);
        $resumo = [];
        $etapas = [
            'municipios_ibge' => fn () => $this->ibge->municipios($uf),
            'populacao_ibge' => fn () => $this->ibge->populacao($uf),
            'malha_ibge' => fn () => $this->ibge->malha($uf),
            'eleitorado_tse' => fn () => $this->tse->eleitorado($uf, $anoEleitorado),
            'eleitos_tse' => fn () => $this->tse->mandatarios($uf, $eleicao),
        ];
        foreach ($etapas as $nome => $etapa) {
            $informar && $informar("{$nome}…");
            try {
                $resumo[$nome] = ['ok' => true, 'resultado' => $etapa()];
            } catch (Throwable $e) {
                $resumo[$nome] = ['ok' => false, 'erro' => $e->getMessage()];
                if ($nome === 'municipios_ibge') {
                    break; // sem municípios, as demais fontes não têm onde gravar
                }
            }
        }

        $falhou = collect($resumo)->contains(fn (array $r): bool => !$r['ok']) || count($resumo) < count($etapas);
        $registro->update(['situacao' => $falhou ? 'concluida_com_falhas' : 'concluida', 'resumo' => $resumo, 'concluido_em' => now()]);

        return $registro;
    }
}

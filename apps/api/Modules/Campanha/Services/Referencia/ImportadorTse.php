<?php

declare(strict_types=1);

namespace Modules\Campanha\Services\Referencia;

use DomainException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Referencia\RefMandatario;
use Modules\Campanha\Models\Referencia\RefMunicipio;

/**
 * Eleitorado (eleitores, zonas e seções) e eleitos (prefeito, vice e vereadores) — dados abertos do TSE
 * (D4). O TSE usa código de município próprio: a associação com o IBGE é pelo nome normalizado na UF, com
 * a tabela de exceções do config; o que não associa vai para o relatório.
 */
final class ImportadorTse
{
    /** Cargos importados → cargo gravado; prefeito/vice só com "ELEITO", vereador com "ELEITO*". */
    private const CARGOS = ['PREFEITO' => 'prefeito', 'VICE-PREFEITO' => 'vice_prefeito', 'VEREADOR' => 'vereador'];

    public function __construct(private readonly LeitorCsvZip $leitor) {}

    /**
     * Eleitorado por município do ano pedido (ou, sem ano, do mais recente publicado até 4 anos atrás).
     *
     * @return array{ano: int, municipios: int, eleitores: int, nao_associados: list<string>}
     */
    public function eleitorado(string $uf, ?int $ano = null): array
    {
        $uf = strtoupper($uf);
        $anos = $ano !== null ? [$ano] : range((int) now()->format('Y'), (int) now()->format('Y') - 4);
        foreach ($anos as $tentativa) {
            $zip = $this->leitor->baixar(config('campanha.fontes.tse_dados_abertos') . "/eleitorado_locais_votacao/eleitorado_local_votacao_{$tentativa}.zip");
            if ($zip === null) {
                continue;
            }
            try {
                return ['ano' => $tentativa, ...$this->gravarEleitorado($uf, $tentativa, $zip)];
            } finally {
                @unlink($zip);
            }
        }

        throw new DomainException('Nenhum arquivo de eleitorado do TSE encontrado para ' . implode(', ', $anos) . '.');
    }

    /**
     * Eleitos do ano (eleição municipal): prefeito e vice (vale a eleição mais recente — suplementares) e vereadores.
     *
     * @return array{ano: int, prefeitos: int, vices: int, vereadores: int, nao_associados: list<string>}
     */
    public function mandatarios(string $uf, int $ano): array
    {
        $uf = strtoupper($uf);
        $zip = $this->leitor->baixar(config('campanha.fontes.tse_dados_abertos') . "/consulta_cand/consulta_cand_{$ano}.zip")
            ?? throw new DomainException("Arquivo de candidatos {$ano} do TSE não encontrado.");
        try {
            $mapa = $this->mapaDeNomes($uf);
            $naoAssociados = [];
            $executivo = [];
            $vereadores = [];
            foreach ($this->leitor->linhas($zip, "consulta_cand_{$ano}_{$uf}.csv") as $l) {
                $cargo = self::CARGOS[$l['DS_CARGO'] ?? ''] ?? null;
                $situacao = (string) ($l['DS_SIT_TOT_TURNO'] ?? '');
                if ($cargo === null || !str_starts_with($situacao, 'ELEITO')) {
                    continue;
                }
                $ibge = $this->associar($mapa, (string) $l['NM_UE']);
                if ($ibge === null) {
                    $naoAssociados[(string) $l['NM_UE']] = true;
                    continue;
                }
                $linha = [
                    'uf' => $uf, 'codigo_ibge' => $ibge, 'cargo' => $cargo, 'nome' => $l['NM_CANDIDATO'], 'nome_urna' => $l['NM_URNA_CANDIDATO'] ?: null,
                    'partido' => $l['SG_PARTIDO'] ?: null, 'numero' => $l['NR_CANDIDATO'] ?: null, 'situacao' => $situacao, 'ano_eleicao' => $ano,
                    'data_eleicao' => self::data((string) ($l['DT_ELEICAO'] ?? '')),
                ];
                if ($cargo === 'vereador') {
                    $vereadores[] = $linha;
                    continue;
                }
                // Eleição suplementar: fica o eleito da data mais recente.
                $chave = "{$ibge}-{$cargo}";
                if (!isset($executivo[$chave]) || (string) $linha['data_eleicao'] > (string) $executivo[$chave]['data_eleicao']) {
                    $executivo[$chave] = $linha;
                }
            }

            $agora = now();
            $todas = array_map(fn (array $l): array => [...$l, 'created_at' => $agora, 'updated_at' => $agora], [...array_values($executivo), ...$vereadores]);
            DB::transaction(function () use ($uf, $ano, $todas): void {
                RefMandatario::query()->where('uf', $uf)->where('ano_eleicao', $ano)->delete();
                foreach (array_chunk($todas, 500) as $lote) {
                    RefMandatario::query()->insert($lote);
                }
            });

            $porCargo = array_count_values(array_column(array_values($executivo), 'cargo'));

            return [
                'ano' => $ano,
                'prefeitos' => $porCargo['prefeito'] ?? 0,
                'vices' => $porCargo['vice_prefeito'] ?? 0,
                'vereadores' => count($vereadores),
                'nao_associados' => array_keys($naoAssociados),
            ];
        } finally {
            @unlink($zip);
        }
    }

    /** @return array{municipios: int, eleitores: int, nao_associados: list<string>} */
    private function gravarEleitorado(string $uf, int $ano, string $zip): array
    {
        $porMunicipio = [];
        foreach ($this->leitor->linhas($zip, "eleitorado_local_votacao_{$ano}_{$uf}.csv") as $l) {
            $codigo = (string) $l['CD_MUNICIPIO'];
            $m = $porMunicipio[$codigo] ??= ['nome' => (string) $l['NM_MUNICIPIO'], 'eleitores' => 0, 'zonas' => [], 'secoes' => []];
            $m['eleitores'] += (int) $l['QT_ELEITOR_SECAO'];
            $m['zonas'][(string) $l['NR_ZONA']] = true;
            $m['secoes'][$l['NR_ZONA'] . '-' . $l['NR_SECAO']] = true;
            $porMunicipio[$codigo] = $m;
        }

        $mapa = $this->mapaDeNomes($uf);
        $naoAssociados = [];
        $total = 0;
        $associados = 0;
        DB::transaction(function () use ($porMunicipio, $mapa, $ano, &$naoAssociados, &$total, &$associados): void {
            foreach ($porMunicipio as $codigoTse => $m) {
                $ibge = $this->associar($mapa, $m['nome']);
                if ($ibge === null) {
                    $naoAssociados[] = $m['nome'];
                    continue;
                }
                RefMunicipio::query()->whereKey($ibge)->update([
                    'codigo_tse' => (string) $codigoTse, 'eleitores' => $m['eleitores'], 'zonas' => count($m['zonas']),
                    'secoes' => count($m['secoes']), 'ano_eleitorado' => $ano, 'updated_at' => now(),
                ]);
                $total += $m['eleitores'];
                $associados++;
            }
        });

        return ['municipios' => $associados, 'eleitores' => $total, 'nao_associados' => $naoAssociados];
    }

    /** @return array<string, int> nome normalizado → código IBGE */
    private function mapaDeNomes(string $uf): array
    {
        $mapa = RefMunicipio::query()->where('uf', $uf)->pluck('codigo_ibge', 'nome_normalizado')->map(fn ($c): int => (int) $c)->all();
        if ($mapa === []) {
            throw new DomainException("Importe primeiro os municípios do IBGE da UF {$uf}.");
        }

        return $mapa;
    }

    /** @param array<string, int> $mapa */
    private function associar(array $mapa, string $nomeTse): ?int
    {
        $chave = RefMunicipio::normalizar($nomeTse);
        $chave = config("campanha.excecoes_nomes.{$chave}", $chave);

        return $mapa[$chave] ?? null;
    }

    private static function data(string $valor): ?string
    {
        return preg_match('#^\d{2}/\d{2}/\d{4}$#', $valor) ? Carbon::createFromFormat('d/m/Y', $valor)->toDateString() : null;
    }
}

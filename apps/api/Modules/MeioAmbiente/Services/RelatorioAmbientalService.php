<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Modules\MeioAmbiente\Models\ColetaResiduo;
use Modules\MeioAmbiente\Models\EntregaLogisticaReversa;
use Modules\MeioAmbiente\Models\GeradorResiduo;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Support\RegraNegocioException;

/**
 * Relatórios ambientais obrigatórios (RARS e inventário de GEE), consolidados por
 * exercício a partir dos dados já lançados no módulo. Não existe cliente real de
 * nenhum órgão de controle (design.md, Non-Goals) — a exportação entrega o arquivo
 * no formato pedido (CSV/JSON/PDF) para envio manual ou pela integração da Fase 11.
 */
final class RelatorioAmbientalService
{
    /**
     * Fator de emissão para resíduo disposto em aterro sem recuperação de metano, em
     * tCO2e por tonelada. Valor de referência simplificado (ordem de grandeza do
     * método de decaimento de primeira ordem do IPCC 2006, Vol. 5, para resíduo
     * urbano misto) — **deve ser validado pela equipe técnica da Secretaria** antes
     * de um inventário oficial; mesmo princípio da tabela de multa da Fase 4: valor
     * configurável, nunca tratado como definitivo.
     */
    public const FATOR_EMISSAO_ATERRO_TCO2E_POR_T = 0.5;

    /**
     * Fator de emissão para queima de biomassa, em tCO2e por hectare queimado.
     * Derivado do IPCC 2006, Vol. 4, Tabelas 2.4/2.5 para savana/cerrado (≈4,6 t de
     * matéria seca consumida por ha; CO2 1.613 g/kg, CH4 2,3 g/kg × GWP 28, N2O
     * 0,21 g/kg × GWP 265 ≈ 8 tCO2e/ha). Mesma ressalva de validação acima — a
     * vegetação predominante do município pode mudar bastante esse número.
     */
    public const FATOR_EMISSAO_QUEIMADA_TCO2E_POR_HA = 8.0;

    /** Reciclagem não gera emissão contabilizada no inventário (só a disposição em aterro). */
    private const FONTE_RESIDUOS_ATERRO = 'residuos_aterro';
    private const FONTE_QUEIMADAS = 'queimadas';

    public function gerarRelatorio(string $tipo, int $exercicio, ?int $geradoPor = null): RelatorioAmbiental
    {
        $dados = match ($tipo) {
            RelatorioAmbiental::TIPO_RARS => $this->consolidarRars($exercicio),
            RelatorioAmbiental::TIPO_GEE => $this->consolidarGee($exercicio),
            default => throw new RegraNegocioException('tipo_relatorio_invalido', 'Tipo de relatório ambiental não suportado.'),
        };

        return RelatorioAmbiental::create([
            'tipo' => $tipo,
            'exercicio' => $exercicio,
            'dados' => $dados,
            'gerado_por' => $geradoPor,
        ]);
    }

    /**
     * @return array{conteudo: string, content_type: string, nome_arquivo: string}
     */
    public function exportarRelatorio(RelatorioAmbiental $relatorio, string $formato): array
    {
        $nomeBase = sprintf('%s_%d_%d', $relatorio->tipo, $relatorio->exercicio, $relatorio->id);

        return match ($formato) {
            RelatorioAmbiental::FORMATO_JSON => [
                'conteudo' => (string) json_encode($this->envelope($relatorio), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'content_type' => 'application/json',
                'nome_arquivo' => "{$nomeBase}.json",
            ],
            RelatorioAmbiental::FORMATO_CSV => [
                'conteudo' => $this->paraCsv($this->linhas($relatorio)),
                'content_type' => 'text/csv; charset=UTF-8',
                'nome_arquivo' => "{$nomeBase}.csv",
            ],
            RelatorioAmbiental::FORMATO_PDF => [
                'conteudo' => Pdf::loadHTML($this->paraHtml($relatorio))->setPaper('a4', 'portrait')->output(),
                'content_type' => 'application/pdf',
                'nome_arquivo' => "{$nomeBase}.pdf",
            ],
            default => throw new RegraNegocioException('formato_exportacao_invalido', 'Formato de exportação não suportado.'),
        };
    }

    /**
     * RARS: volumes coletados no exercício por tipo de coleta × destinação, por tipo
     * de gerador, e entregas de logística reversa por categoria.
     *
     * @return array<string, mixed>
     */
    private function consolidarRars(int $exercicio): array
    {
        [$inicio, $fim] = $this->limitesExercicio($exercicio);

        $coletas = ColetaResiduo::query()
            ->whereBetween('coletada_em', [$inicio, $fim])
            ->with('gerador')
            ->get();

        $porTipoEDestinacao = [];
        foreach (ColetaResiduo::TIPOS_COLETA_VALIDOS as $tipoColeta) {
            foreach (ColetaResiduo::DESTINACOES_VALIDAS as $destinacao) {
                $doGrupo = $coletas->where('tipo_coleta', $tipoColeta)->where('destinacao', $destinacao);
                $porTipoEDestinacao[] = [
                    'tipo_coleta' => $tipoColeta,
                    'destinacao' => $destinacao,
                    'quantidade_coletas' => $doGrupo->count(),
                    'volume_toneladas' => $this->toneladas((float) $doGrupo->sum('volume_kg')),
                ];
            }
        }

        $porTipoGerador = [];
        foreach (GeradorResiduo::TIPOS_VALIDOS as $tipoGerador) {
            $porTipoGerador[$tipoGerador] = $this->toneladas(
                (float) $coletas->filter(fn (ColetaResiduo $c): bool => $c->gerador?->tipo === $tipoGerador)->sum('volume_kg'),
            );
        }

        $logisticaReversa = EntregaLogisticaReversa::query()
            ->whereBetween('entregue_em', [$inicio, $fim])
            ->with('ponto')
            ->get()
            ->groupBy(fn (EntregaLogisticaReversa $e): string => (string) $e->ponto?->categoria)
            ->map(fn ($entregas): float => $this->toneladas((float) $entregas->sum('quantidade_kg')))
            ->all();

        return [
            'exercicio' => $exercicio,
            'total_coletado_toneladas' => $this->toneladas((float) $coletas->sum('volume_kg')),
            'por_tipo_coleta_e_destinacao' => $porTipoEDestinacao,
            'por_tipo_gerador_toneladas' => $porTipoGerador,
            'logistica_reversa_toneladas_por_categoria' => $logisticaReversa,
        ];
    }

    /**
     * Inventário de GEE do exercício a partir das fontes que o módulo registra hoje:
     * resíduos destinados a aterro (seção 6) e área queimada (seção 8). Fontes que o
     * monorepo não registra (frota, energia, efluentes) ficam fora — ver nota da
     * Fase 10 no tasks.md.
     *
     * @return array<string, mixed>
     */
    private function consolidarGee(int $exercicio): array
    {
        [$inicio, $fim] = $this->limitesExercicio($exercicio);

        $aterroToneladas = $this->toneladas((float) ColetaResiduo::query()
            ->whereBetween('coletada_em', [$inicio, $fim])
            ->where('destinacao', ColetaResiduo::DESTINACAO_ATERRO)
            ->sum('volume_kg'));

        $areaQueimadaHa = round((float) OcorrenciaQueimada::query()
            ->whereBetween('data_ocorrencia', [$inicio, $fim])
            ->sum('area_queimada_ha'), 2);

        $fontes = [
            [
                'fonte' => self::FONTE_RESIDUOS_ATERRO,
                'dado_atividade' => $aterroToneladas,
                'unidade' => 't',
                'fator_emissao' => self::FATOR_EMISSAO_ATERRO_TCO2E_POR_T,
                'emissoes_tco2e' => round($aterroToneladas * self::FATOR_EMISSAO_ATERRO_TCO2E_POR_T, 3),
            ],
            [
                'fonte' => self::FONTE_QUEIMADAS,
                'dado_atividade' => $areaQueimadaHa,
                'unidade' => 'ha',
                'fator_emissao' => self::FATOR_EMISSAO_QUEIMADA_TCO2E_POR_HA,
                'emissoes_tco2e' => round($areaQueimadaHa * self::FATOR_EMISSAO_QUEIMADA_TCO2E_POR_HA, 3),
            ],
        ];

        return [
            'exercicio' => $exercicio,
            'fontes' => $fontes,
            'total_emissoes_tco2e' => round(array_sum(array_column($fontes, 'emissoes_tco2e')), 3),
            'metodologia' => 'Estimativa simplificada (IPCC 2006, Tier 1) com fatores de emissão de referência; fontes não registradas no sistema (energia, frota, efluentes) não estão incluídas.',
        ];
    }

    /** @return array<string, mixed> */
    private function envelope(RelatorioAmbiental $relatorio): array
    {
        return [
            'tipo' => $relatorio->tipo,
            'exercicio' => $relatorio->exercicio,
            'gerado_em' => $relatorio->created_at->toIso8601String(),
            'dados' => $relatorio->dados,
        ];
    }

    /**
     * Tabela "plana" do relatório (cabeçalho + linhas), compartilhada pelo CSV e pelo PDF.
     *
     * @return list<list<string|int|float>>
     */
    private function linhas(RelatorioAmbiental $relatorio): array
    {
        $dados = $relatorio->dados;

        if ($relatorio->tipo === RelatorioAmbiental::TIPO_GEE) {
            $linhas = [['Fonte', 'Dado de atividade', 'Unidade', 'Fator de emissão (tCO2e/unidade)', 'Emissões (tCO2e)']];
            foreach ($dados['fontes'] as $fonte) {
                $linhas[] = [$fonte['fonte'], $fonte['dado_atividade'], $fonte['unidade'], $fonte['fator_emissao'], $fonte['emissoes_tco2e']];
            }
            $linhas[] = ['total', '', '', '', $dados['total_emissoes_tco2e']];

            return $linhas;
        }

        $linhas = [['Tipo de coleta', 'Destinação', 'Quantidade de coletas', 'Volume (t)']];
        foreach ($dados['por_tipo_coleta_e_destinacao'] as $grupo) {
            $linhas[] = [$grupo['tipo_coleta'], $grupo['destinacao'], $grupo['quantidade_coletas'], $grupo['volume_toneladas']];
        }
        $linhas[] = ['total', '', '', $dados['total_coletado_toneladas']];

        return $linhas;
    }

    /** @param list<list<string|int|float>> $linhas */
    private function paraCsv(array $linhas): string
    {
        $saida = fopen('php://temp', 'r+');
        // BOM para o Excel em pt-BR abrir acentuação corretamente; separador ';' como no Capd.
        fwrite($saida, "\xEF\xBB\xBF");
        foreach ($linhas as $linha) {
            fputcsv($saida, $linha, ';');
        }
        rewind($saida);
        $conteudo = (string) stream_get_contents($saida);
        fclose($saida);

        return $conteudo;
    }

    private function paraHtml(RelatorioAmbiental $relatorio): string
    {
        $titulo = $relatorio->tipo === RelatorioAmbiental::TIPO_GEE
            ? 'Inventário de Emissões de Gases de Efeito Estufa'
            : 'Relatório Anual de Resíduos Sólidos';

        $linhas = $this->linhas($relatorio);
        $cabecalho = array_shift($linhas);

        $th = implode('', array_map(fn ($c): string => '<th>' . e((string) $c) . '</th>', $cabecalho));
        $tr = implode('', array_map(
            fn (array $linha): string => '<tr>' . implode('', array_map(fn ($c): string => '<td>' . e((string) $c) . '</td>', $linha)) . '</tr>',
            $linhas,
        ));

        $nota = $relatorio->tipo === RelatorioAmbiental::TIPO_GEE
            ? '<p class="nota">' . e((string) $relatorio->dados['metodologia']) . '</p>'
            : '';

        return '<html><head><meta charset="utf-8"><style>'
            . 'body{font-family:DejaVu Sans,sans-serif;font-size:11px}h1{font-size:16px}'
            . 'table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px;text-align:left}'
            . 'th{background:#eee}.nota{color:#555;font-size:9px;margin-top:12px}'
            . '</style></head><body>'
            . '<h1>' . e($titulo) . ' — Exercício ' . $relatorio->exercicio . '</h1>'
            . '<p>Gerado em ' . e($relatorio->created_at->format('d/m/Y H:i')) . '</p>'
            . "<table><thead><tr>{$th}</tr></thead><tbody>{$tr}</tbody></table>"
            . $nota
            . '</body></html>';
    }

    /** @return array{0: string, 1: string} */
    private function limitesExercicio(int $exercicio): array
    {
        return [sprintf('%04d-01-01', $exercicio), sprintf('%04d-12-31', $exercicio)];
    }

    private function toneladas(float $kg): float
    {
        return round($kg / 1000, 3);
    }
}

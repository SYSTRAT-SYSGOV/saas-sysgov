<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use Modules\Licita\Models\PesquisaPreco;

/**
 * Orquestra a sugestão de cotações da Pesquisa de Preços a partir de dados
 * reais do Compras.gov.br (ComprasGovPrecoService), com saneamento
 * estatístico (SaneamentoEstatisticoService) e uma justificativa de método
 * escrita por IA. Diferente de MapaRiscoIaService: se o provedor de IA
 * falhar, NÃO propaga a exceção — o valor real desta feature (cotações
 * reais e saneamento estatístico determinístico) não deve depender da
 * disponibilidade do provedor de IA, então cai para uma justificativa
 * gerada por template.
 */
final class PesquisaPrecoIaService
{
    /** Máximo de cotações sugeridas por item — o bastante para folga acima do mínimo do RN-006 sem poluir o formulário. */
    private const MAXIMO_COTACOES_SUGERIDAS = 8;

    public function __construct(
        private readonly ComprasGovPrecoService $comprasGov,
        private readonly SaneamentoEstatisticoService $saneamento,
        private readonly NanoGptClient $client,
    ) {}

    /**
     * @return array{itens: array<int, array{codigo: string, cotacoes_sugeridas: array<int, array{fonte: string, fornecedor: string|null, valor_unitario: float, data_cotacao: string|null, referencia: string}>, estatisticas: array{total_encontrado: int, cv_percentual_final: float, outliers_removidos: int}}>, justificativa_metodo_sugerida: string}
     */
    public function sugerirCotacoes(PesquisaPreco $pesquisaPreco): array
    {
        $itensResultado = [];

        foreach ($pesquisaPreco->itens ?? [] as $item) {
            $tipo = $item['tipo'] ?? null;
            $codigo = $item['codigo'];
            if (!in_array($tipo, ['material', 'servico'], true) || trim($codigo) === '') {
                continue;
            }

            $brutos = $this->comprasGov->buscarPrecos($tipo, $codigo);
            if ($brutos === []) {
                continue;
            }

            $valores = array_column($brutos, 'valor_unitario');
            $saneamento = $this->saneamento->sanear($valores);

            // Mantém só os registros brutos cujo valor sobreviveu ao
            // saneamento, priorizando diversidade de fornecedor e
            // recência (datas mais recentes primeiro).
            $sobreviventes = array_values(array_filter(
                $brutos,
                static fn (array $b): bool => in_array($b['valor_unitario'], $saneamento['valores_saneados'], true),
            ));
            usort($sobreviventes, static fn (array $a, array $b): int => strcmp((string) ($b['data_compra'] ?? ''), (string) ($a['data_compra'] ?? '')));

            $fornecedoresUsados = [];
            $cotacoesSugeridas = [];
            foreach ($sobreviventes as $registro) {
                if (count($cotacoesSugeridas) >= self::MAXIMO_COTACOES_SUGERIDAS) {
                    break;
                }

                $fornecedor = $registro['fornecedor'] ?? null;
                if ($fornecedor !== null && in_array($fornecedor, $fornecedoresUsados, true)) {
                    continue;
                }
                if ($fornecedor !== null) {
                    $fornecedoresUsados[] = $fornecedor;
                }

                $cotacoesSugeridas[] = [
                    'fonte' => 'Consulta Compras.gov.br (Pesquisa de Preço)',
                    'fornecedor' => $fornecedor,
                    'valor_unitario' => $registro['valor_unitario'],
                    'data_cotacao' => $registro['data_compra'],
                    'referencia' => $registro['referencia'],
                ];
            }

            if ($cotacoesSugeridas === []) {
                continue;
            }

            $itensResultado[] = [
                'codigo' => $codigo,
                'cotacoes_sugeridas' => $cotacoesSugeridas,
                'estatisticas' => [
                    'total_encontrado' => count($brutos),
                    'cv_percentual_final' => round($saneamento['cv_percentual'], 1),
                    'outliers_removidos' => count($saneamento['outliers_removidos']),
                ],
            ];
        }

        return [
            'itens' => $itensResultado,
            'justificativa_metodo_sugerida' => $this->gerarJustificativa($itensResultado),
        ];
    }

    /**
     * @param array<int, array{codigo: string, cotacoes_sugeridas: array<int, mixed>, estatisticas: array{total_encontrado: int, cv_percentual_final: float, outliers_removidos: int}}> $itensResultado
     */
    private function gerarJustificativa(array $itensResultado): string
    {
        if ($itensResultado === []) {
            return $this->justificativaTemplate($itensResultado);
        }

        $resumo = collect($itensResultado)
            ->map(fn (array $i): string => "- Item {$i['codigo']}: {$i['estatisticas']['total_encontrado']} cotações encontradas, "
                . "{$i['estatisticas']['outliers_removidos']} outlier(s) removido(s), CV% final de {$i['estatisticas']['cv_percentual_final']}%.")
            ->implode("\n");

        $prompt = "Escreva um parágrafo curto (3 a 5 frases) de justificativa do método de pesquisa de preços "
            . 'para instrução processual de uma contratação pública brasileira, citando a IN SEGES/ME nº 65/2021. '
            . "Explique que a pesquisa foi realizada por consulta pública ao Compras.gov.br (dados abertos de preços "
            . "praticados em compras públicas), com saneamento estatístico dos valores por Coeficiente de Variação "
            . "(remoção de outliers até CV% inferior a 25%, conforme entendimento do TCU). Resuma os resultados "
            . "abaixo, sem inventar números que não estejam neles:\n\n{$resumo}\n\n"
            . 'Responda APENAS com o parágrafo em português, sem markdown, sem título, sem listas.';

        try {
            $resultado = $this->client->chatCompletion([
                ['role' => 'system', 'content' => 'Você é um especialista em pesquisa de preços de contratações públicas brasileiras (Lei 14.133/2021).'],
                ['role' => 'user', 'content' => $prompt],
            ]);

            $texto = trim($resultado['content']);

            return $texto !== '' ? mb_substr($texto, 0, 2000) : $this->justificativaTemplate($itensResultado);
        } catch (AiException) {
            return $this->justificativaTemplate($itensResultado);
        }
    }

    /**
     * @param array<int, array{codigo: string, cotacoes_sugeridas: array<int, mixed>, estatisticas: array{total_encontrado: int, cv_percentual_final: float, outliers_removidos: int}}> $itensResultado
     */
    private function justificativaTemplate(array $itensResultado): string
    {
        if ($itensResultado === []) {
            return 'Pesquisa de preços realizada por consulta pública ao Compras.gov.br (dados abertos de preços '
                . 'praticados em compras públicas), conforme IN SEGES/ME nº 65/2021. Nenhum resultado foi '
                . 'encontrado para os códigos de catálogo informados nesta consulta.';
        }

        $totalOutliers = array_sum(array_column(array_column($itensResultado, 'estatisticas'), 'outliers_removidos'));

        return 'Pesquisa de preços realizada por consulta pública ao Compras.gov.br (dados abertos de preços '
            . 'praticados em compras públicas), conforme IN SEGES/ME nº 65/2021. Os valores coletados foram '
            . "submetidos a saneamento estatístico por Coeficiente de Variação (CV%), com remoção de {$totalOutliers} "
            . 'valor(es) discrepante(s) no total, até que a dispersão da amostra ficasse dentro do parâmetro de '
            . 'razoabilidade adotado pelo Tribunal de Contas da União (CV% inferior a 25%).';
    }
}

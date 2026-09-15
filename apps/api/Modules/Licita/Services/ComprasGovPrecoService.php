<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Consulta pública (sem autenticação) ao módulo "Pesquisa de Preço" do
 * Compras.gov.br / Dados Abertos — devolve preços praticados em compras
 * públicas reais filtrando direto por código de catálogo (CATMAT para
 * materiais, CATSER para serviços), sem precisar varrer contrato por
 * contrato do PNCP. Mesmo espírito de `App\Services\CnpjService` (chamada
 * externa sem chave, cache e falha silenciosa): nunca propaga exceção, pois
 * a indisponibilidade desta API pública de terceiros não pode derrubar o
 * restante da Pesquisa de Preços.
 *
 * Não é `final` de propósito — mesmo motivo do `NanoGptClient`: os testes de
 * `PesquisaPrecoIaService` precisam mocká-la com Mockery.
 */
class ComprasGovPrecoService
{
    private const BASE_URL = 'https://dadosabertos.compras.gov.br';
    private const TTL_CACHE_SEGUNDOS = 12 * 3600;
    private const TAMANHO_PAGINA = 500;

    /**
     * @return array<int, array{fornecedor: string|null, cnpj_fornecedor: string|null, valor_unitario: float, data_compra: string|null, orgao: string|null, uf: string|null, referencia: string}>
     */
    public function buscarPrecos(string $tipo, string $codigoItemCatalogo): array
    {
        $codigo = trim($codigoItemCatalogo);
        if ($codigo === '' || !in_array($tipo, ['material', 'servico'], true)) {
            return [];
        }

        // Dado público (preços praticados por qualquer órgão), não é
        // tenant-scoped — cachear entre tenants é intencional: evita bater
        // repetidamente na API pública para o mesmo código de catálogo.
        return Cache::remember(
            "licita.compras_gov.precos.{$tipo}.{$codigo}",
            self::TTL_CACHE_SEGUNDOS,
            function () use ($tipo, $codigo): array {
                try {
                    return $this->consultar($tipo, $codigo);
                } catch (\Throwable $e) {
                    Log::warning('Falha ao consultar preços no Compras.gov.br', [
                        'tipo' => $tipo,
                        'codigo' => $codigo,
                        'erro' => $e->getMessage(),
                    ]);

                    return [];
                }
            },
        );
    }

    /**
     * @param 'material'|'servico' $tipo
     * @return array<int, array{fornecedor: string|null, cnpj_fornecedor: string|null, valor_unitario: float, data_compra: string|null, orgao: string|null, uf: string|null, referencia: string}>
     */
    private function consultar(string $tipo, string $codigo): array
    {
        // As duas rotas têm assinaturas de parâmetros diferentes (confirmado
        // no Swagger em dadosabertos.compras.gov.br/swagger-ui — diverge do
        // manual PDF oficial nº 2.0, que documenta as duas com o mesmo
        // parâmetro `codigoItemCatalogo`): materiais exigem o par
        // `tipo=codigoItemCatalogo&codigo=...`, serviços recebem
        // `codigoItemCatalogo=...` diretamente.
        [$endpoint, $query] = $tipo === 'material'
            ? ['/modulo-pesquisa-preco/1_consultarMaterial', ['tipo' => 'codigoItemCatalogo', 'codigo' => $codigo]]
            : ['/modulo-pesquisa-preco/3_consultarServico', ['codigoItemCatalogo' => $codigo]];

        $response = Http::timeout(15)->get(self::BASE_URL . $endpoint, [
            ...$query,
            'pagina' => 1,
            'tamanhoPagina' => self::TAMANHO_PAGINA,
        ]);

        if (!$response->successful()) {
            return [];
        }

        $corpo = $response->json();
        $registros = is_array($corpo) ? ($corpo['resultado'] ?? $corpo) : [];
        if (!is_array($registros)) {
            return [];
        }

        $itens = [];
        foreach ($registros as $registro) {
            if (!is_array($registro) || !isset($registro['precoUnitario']) || !is_numeric($registro['precoUnitario'])) {
                continue;
            }

            $valorUnitario = (float) $registro['precoUnitario'];
            if ($valorUnitario <= 0) {
                continue;
            }

            $orgao = $registro['nomeOrgao'] ?? null;
            $uf = $registro['estado'] ?? null;
            $idCompra = $registro['idCompra'] ?? null;

            $itens[] = [
                'fornecedor' => $registro['nomeFornecedor'] ?? null,
                'cnpj_fornecedor' => $registro['niFornecedor'] ?? null,
                'valor_unitario' => $valorUnitario,
                'data_compra' => $registro['dataCompra'] ?? null,
                'orgao' => $orgao,
                'uf' => $uf,
                'referencia' => 'Compras.gov.br — Compra ' . ($idCompra ?? '?')
                    . (filled($orgao) ? " ({$orgao}" . (filled($uf) ? "/{$uf}" : '') . ')' : ''),
            ];
        }

        return $itens;
    }
}

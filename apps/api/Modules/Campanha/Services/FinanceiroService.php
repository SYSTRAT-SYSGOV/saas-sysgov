<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Lancamento;
use Modules\Campanha\Models\Material;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;
use Modules\Campanha\Support\Documento;

/**
 * Livro-caixa da campanha de trabalho com os campos da prestação de contas do TSE (D4): validação por tipo,
 * CPF/CNPJ, centro de custo na UF, totais em centavos e exportação auditada. Não gera o arquivo do SPCE.
 */
final class FinanceiroService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly CampanhaContext $campanha,
        private readonly MunicipioService $municipios,
    ) {}

    /** @param array<string, mixed> $dados */
    public function salvar(?Lancamento $lancamento, array $dados): Lancamento
    {
        $tipo = (string) ($dados['tipo'] ?? $lancamento?->tipo);
        $categoria = (string) ($dados['categoria'] ?? $lancamento?->categoria);
        if (!array_key_exists($categoria, Lancamento::CATEGORIAS[$tipo] ?? [])) {
            throw new DomainException('Categoria inválida para ' . ($tipo === 'receita' ? 'receita.' : 'despesa.'));
        }
        if ($tipo === 'receita' && empty($dados['origem_recurso'] ?? $lancamento?->origem_recurso)) {
            throw new DomainException('Informe a origem do recurso da receita.');
        }
        if (!empty($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if (!empty($dados['material_id']) && !Material::query()->whereKey((int) $dados['material_id'])->exists()) {
            throw new DomainException('Material não encontrado nesta campanha.');
        }
        if (array_key_exists('contraparte_documento', $dados)) {
            $digitos = Documento::digitos((string) $dados['contraparte_documento']);
            if ($digitos !== '' && !Documento::valido($digitos)) {
                throw new DomainException('CPF ou CNPJ inválido.');
            }
            $dados['contraparte_documento'] = $digitos === '' ? null : $digitos;
            $dados['contraparte_documento_hash'] = $digitos === '' ? null : Lancamento::hashDocumento($digitos);
        }
        // Campos que só existem num dos tipos (recibo eleitoral na receita; documento fiscal na despesa).
        if ($tipo === 'receita') {
            $dados['documento_fiscal_tipo'] = null;
            $dados['documento_fiscal_numero'] = null;
        } else {
            $dados['recibo_eleitoral'] = null;
        }

        return DB::transaction(function () use ($lancamento, $dados): Lancamento {
            $antes = $lancamento !== null ? $this->semDocumento($lancamento) : null;
            $lancamento ??= new Lancamento();
            $lancamento->fill($dados)->save();
            $this->auditar('lancamento', $antes === null ? 'criado' : 'atualizado', $lancamento->id, $antes, $this->semDocumento($lancamento));

            return $lancamento;
        });
    }

    public function excluir(Lancamento $lancamento): void
    {
        DB::transaction(function () use ($lancamento): void {
            $antes = $this->semDocumento($lancamento);
            $lancamento->delete();
            $this->auditar('lancamento', 'excluido', $lancamento->id, $antes, null);
        });
    }

    /**
     * @param array<string, mixed> $filtros de, ate, tipo, categoria, origem_recurso, codigo_ibge (0 = campanha geral), busca
     * @return Builder<Lancamento>
     */
    public function consulta(array $filtros): Builder
    {
        $q = Lancamento::query();
        foreach (['tipo', 'categoria', 'origem_recurso'] as $campo) {
            if (!empty($filtros[$campo])) {
                $q->where($campo, $filtros[$campo]);
            }
        }
        if (isset($filtros['codigo_ibge']) && $filtros['codigo_ibge'] !== '') {
            (int) $filtros['codigo_ibge'] === 0 ? $q->whereNull('codigo_ibge') : $q->where('codigo_ibge', (int) $filtros['codigo_ibge']);
        }
        if (!empty($filtros['de'])) {
            $q->where('data', '>=', $filtros['de']);
        }
        if (!empty($filtros['ate'])) {
            $q->where('data', '<=', $filtros['ate']);
        }
        if (!empty($filtros['busca'])) {
            $digitos = Documento::digitos((string) $filtros['busca']);
            $q->where(fn ($w) => $w->where('contraparte_nome', 'like', '%' . $filtros['busca'] . '%')
                ->when(strlen($digitos) >= 11, fn ($w) => $w->orWhere('contraparte_documento_hash', Lancamento::hashDocumento($digitos))));
        }

        return $q->orderByDesc('data')->orderByDesc('id');
    }

    /**
     * Totais em centavos (somas no banco, inteiras).
     *
     * @param array<string, mixed> $filtros
     * @return array<string, mixed>
     */
    public function resumo(array $filtros): array
    {
        $porTipo = fn (string $campo): Collection => $this->consulta($filtros)->reorder()
            ->select('tipo', $campo, DB::raw('sum(valor_centavos) as total'))->groupBy('tipo', $campo)->get();
        $somar = fn (Collection $linhas, string $tipo): int => (int) $linhas->where('tipo', $tipo)->sum(fn ($l) => (int) $l->getAttribute('total'));
        $categorias = $porTipo('categoria');
        $receitas = $somar($categorias, 'receita');
        $despesas = $somar($categorias, 'despesa');
        $nomes = RefMunicipio::query()->where('uf', $this->campanha->get()->uf)->pluck('nome', 'codigo_ibge');

        return [
            'receitas_centavos' => $receitas,
            'despesas_centavos' => $despesas,
            'saldo_centavos' => $receitas - $despesas,
            'lancamentos' => $this->consulta($filtros)->count(),
            'por_categoria' => $categorias->map(fn ($l) => [
                'tipo' => $l->tipo, 'categoria' => $l->categoria,
                'rotulo' => Lancamento::CATEGORIAS[$l->tipo][$l->categoria] ?? $l->categoria, 'total_centavos' => (int) $l->getAttribute('total'),
            ])->sortByDesc('total_centavos')->values(),
            'por_origem' => $porTipo('origem_recurso')->where('tipo', 'receita')->map(fn ($l) => [
                'origem' => $l->origem_recurso, 'rotulo' => Lancamento::ORIGENS[$l->origem_recurso] ?? 'Sem origem', 'total_centavos' => (int) $l->getAttribute('total'),
            ])->sortByDesc('total_centavos')->values(),
            'por_municipio' => $porTipo('codigo_ibge')->groupBy(fn ($l) => (int) $l->codigo_ibge)->map(fn (Collection $g, int $ibge) => [
                'codigo_ibge' => $ibge === 0 ? null : $ibge,
                'municipio' => $ibge === 0 ? 'Campanha geral' : ($nomes[$ibge] ?? (string) $ibge),
                'receitas_centavos' => $somar($g, 'receita'),
                'despesas_centavos' => $somar($g, 'despesa'),
            ])->sortByDesc('despesas_centavos')->values(),
        ];
    }

    /**
     * Linhas do CSV da prestação de contas (cabeçalho incluído); auditado com a quantidade.
     *
     * @param array<string, mixed> $filtros
     * @return list<list<string|int|null>>
     */
    public function exportar(array $filtros): array
    {
        $nomes = RefMunicipio::query()->where('uf', $this->campanha->get()->uf)->pluck('nome', 'codigo_ibge');
        $lancamentos = $this->consulta($filtros)->reorder()->orderBy('data')->orderBy('id')->get();
        $csv = [['Data', 'Tipo', 'Categoria', 'Origem do recurso', 'Nome do doador/fornecedor', 'CPF/CNPJ', 'Recibo eleitoral', 'Documento fiscal', 'Número do documento', 'Forma de pagamento', 'Valor (R$)', 'Centro de custo', 'Observações']];
        foreach ($lancamentos as $l) {
            $csv[] = [
                $l->data->format('d/m/Y'), $l->tipo === 'receita' ? 'Receita' : 'Despesa', Lancamento::CATEGORIAS[$l->tipo][$l->categoria] ?? $l->categoria,
                $l->origem_recurso !== null ? (Lancamento::ORIGENS[$l->origem_recurso] ?? $l->origem_recurso) : null, $l->contraparte_nome,
                $l->contraparte_documento !== null ? Documento::formatar($l->contraparte_documento) : null, $l->recibo_eleitoral,
                $l->documento_fiscal_tipo !== null ? (Lancamento::DOCUMENTOS_FISCAIS[$l->documento_fiscal_tipo] ?? $l->documento_fiscal_tipo) : null,
                $l->documento_fiscal_numero, Lancamento::FORMAS[$l->forma_pagamento] ?? $l->forma_pagamento,
                sprintf('%d,%02d', intdiv($l->valor_centavos, 100), $l->valor_centavos % 100), $l->codigo_ibge !== null ? ($nomes[$l->codigo_ibge] ?? (string) $l->codigo_ibge) : 'Campanha geral',
                $l->observacoes,
            ];
        }
        DB::transaction(fn () => $this->auditar('lancamentos', 'exportados', $this->campanha->id(), null, ['quantidade' => $lancamentos->count(), 'filtros' => array_keys(array_filter($filtros))]));

        return $csv;
    }

    /** @return array<string, mixed> */
    private function semDocumento(Lancamento $l): array
    {
        return array_diff_key($l->toArray(), ['contraparte_documento' => true]);
    }
}

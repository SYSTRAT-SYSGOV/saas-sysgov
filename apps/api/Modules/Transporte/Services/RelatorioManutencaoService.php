<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\Csv;

/** Gastos de manutenção do ano e histórico por veículo (design D-M6). Só ordens concluídas contam como gasto. */
final class RelatorioManutencaoService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @return array{ano: int, total: float, ordens: int, por_veiculo: list<array<string, mixed>>, por_fornecedor: list<array<string, mixed>>, por_tipo: list<array<string, mixed>>}
     */
    public function gastos(int $ano): array
    {
        $ordens = OrdemServico::query()->with(['veiculo', 'fornecedor.pessoa'])->where('status', 'concluida')->whereYear('concluida_em', $ano)->get();

        $porVeiculo = [];
        $porFornecedor = [];
        $porTipo = [];
        $total = 0.0;
        foreach ($ordens as $o) {
            $valor = (float) ($o->valor ?? 0);
            $total += $valor;
            $v = $o->veiculo;
            $f = $o->fornecedor;
            self::somar($porVeiculo, (string) $o->veiculo_id, $v !== null ? $v->placa . ' — ' . $v->descricao : "Veículo #{$o->veiculo_id}", $valor);
            self::somar($porFornecedor, (string) ($o->fornecedor_id ?? 0), $f !== null ? $f->nome() : 'Serviço interno (sem fornecedor)', $valor);
            self::somar($porTipo, $o->tipo, Catalogo::TIPOS_OS[$o->tipo] ?? $o->tipo, $valor);
        }

        return [
            'ano' => $ano, 'total' => round($total, 2), 'ordens' => $ordens->count(),
            'por_veiculo' => self::ordenar($porVeiculo), 'por_fornecedor' => self::ordenar($porFornecedor), 'por_tipo' => self::ordenar($porTipo),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function historico(Veiculo $veiculo): array
    {
        return OrdemServico::query()->with('fornecedor.pessoa')->where('veiculo_id', $veiculo->id)->orderByDesc('aberta_em')->orderByDesc('id')->get()
            ->map(static fn (OrdemServico $o): array => [
                'id' => $o->id, 'tipo' => $o->tipo, 'tipo_rotulo' => Catalogo::TIPOS_OS[$o->tipo] ?? $o->tipo, 'status' => $o->status, 'descricao' => $o->descricao,
                'fornecedor' => $o->fornecedor?->nome(), 'aberta_em' => $o->aberta_em->toDateString(), 'concluida_em' => $o->concluida_em?->toDateString(),
                'km' => $o->km, 'valor' => $o->valor !== null ? (float) $o->valor : null,
            ])->values()->all();
    }

    public function csv(int $ano): string
    {
        $ordens = OrdemServico::query()->with(['veiculo', 'fornecedor.pessoa'])->whereYear('aberta_em', $ano)->orderBy('aberta_em')->orderBy('id')->get();
        $saida = Csv::BOM . Csv::linha(['Veículo', 'Tipo', 'Descrição', 'Fornecedor', 'Situação', 'Abertura', 'Conclusão', 'Km', 'Valor (R$)']);
        foreach ($ordens as $o) {
            $saida .= Csv::linha([
                $o->veiculo?->placa, Catalogo::TIPOS_OS[$o->tipo] ?? $o->tipo, $o->descricao, $o->fornecedor?->nome(), Catalogo::STATUS_OS[$o->status] ?? $o->status,
                $o->aberta_em->format('d/m/Y'), $o->concluida_em?->format('d/m/Y'), $o->km, $o->valor !== null ? number_format((float) $o->valor, 2, ',', '') : null,
            ]);
        }
        $this->audit->record('transporte', 'manutencao.exportada', "manutencao:{$ano}", null, ['ano' => $ano, 'ordens' => $ordens->count()]);

        return $saida;
    }

    /** @param array<string, array{nome: string, ordens: int, valor: float}> $grupos */
    private static function somar(array &$grupos, string $chave, string $nome, float $valor): void
    {
        $grupos[$chave] ??= ['nome' => $nome, 'ordens' => 0, 'valor' => 0.0];
        $grupos[$chave]['ordens']++;
        $grupos[$chave]['valor'] += $valor;
    }

    /**
     * @param array<string, array{nome: string, ordens: int, valor: float}> $grupos
     * @return list<array{nome: string, ordens: int, valor: float}>
     */
    private static function ordenar(array $grupos): array
    {
        $lista = array_values(array_map(static fn (array $g): array => ['nome' => $g['nome'], 'ordens' => $g['ordens'], 'valor' => round($g['valor'], 2)], $grupos));
        usort($lista, static fn (array $a, array $b): int => $b['valor'] <=> $a['valor']);

        return $lista;
    }
}

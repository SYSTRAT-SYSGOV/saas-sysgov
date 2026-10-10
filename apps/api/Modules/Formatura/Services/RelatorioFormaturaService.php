<?php

declare(strict_types=1);

namespace Modules\Formatura\Services;

use Illuminate\Support\Collection;
use Modules\Formatura\Enums\SituacaoFinanceira;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Pagamento;

/** Relatório financeiro calculado no servidor a partir dos pagamentos registrados (valores em centavos). */
final class RelatorioFormaturaService
{
    public function __construct(private readonly FormandoService $formandos) {}

    /** @return array<string, mixed> */
    public function gerar(Configuracao $configuracao, ?string $inicio = null, ?string $fim = null): array
    {
        $participantes = $this->formandos->listar($configuracao)->where('participa', true)->values();
        $recebidoAno = (int) $participantes->sum('total_pago_centavos');

        $porForma = Pagamento::query()
            // Mesma base do recebido do ano: só participantes das turmas formandas.
            ->whereHas('participacao', fn ($q) => $q->where('configuracao_id', $configuracao->id)->where('participa', true)
                ->whereHas('aluno', fn ($a) => $a->whereIn('turma_id', $configuracao->turmasFormandas())))
            ->when($inicio !== null, fn ($q) => $q->where('data_pagamento', '>=', $inicio))
            ->when($fim !== null, fn ($q) => $q->where('data_pagamento', '<=', $fim))
            ->selectRaw('forma_pagamento, SUM(valor_centavos) as total, COUNT(*) as quantidade')
            ->groupBy('forma_pagamento')
            ->get();
        $totalFormas = (int) $porForma->sum(fn ($l): int => (int) $l->getAttribute('total'));

        $resumo = $this->resumo($participantes, $recebidoAno);
        if ($inicio !== null || $fim !== null) {
            $resumo['recebido_periodo_centavos'] = $totalFormas;
        }

        return [
            'resumo' => $resumo,
            'formas_pagamento' => $porForma->map(fn ($l): array => [
                'forma_pagamento' => $l->forma_pagamento,
                'total_centavos' => (int) $l->getAttribute('total'),
                'quantidade' => (int) $l->getAttribute('quantidade'),
                'percentual' => $totalFormas > 0 ? round((int) $l->getAttribute('total') * 100 / $totalFormas, 2) : 0.0,
            ])->values()->all(),
            'turmas' => $participantes->groupBy('turma')->map(fn (Collection $alunos, string $turma): array => [
                'turma' => $turma,
                ...$this->resumo($alunos, (int) $alunos->sum('total_pago_centavos')),
                'alunos' => $alunos->values()->all(),
            ])->values()->all(),
        ];
    }

    /**
     * @param Collection<int, array<string, mixed>> $alunos
     * @return array<string, int|float>
     */
    private function resumo(Collection $alunos, int $recebido): array
    {
        $aReceber = (int) $alunos->sum('valor_devido_centavos');

        return [
            'valor_total_receber_centavos' => $aReceber,
            'valor_total_recebido_centavos' => $recebido,
            'valor_total_pendente_centavos' => (int) $alunos->sum('saldo_devedor_centavos'),
            'percentual_arrecadado' => $aReceber > 0 ? round($recebido * 100 / $aReceber, 2) : 0.0,
            'total_formandos' => $alunos->count(),
            'total_convidados' => (int) $alunos->sum(fn (array $a): int => $a['convidados_incluidos'] + $a['convidados_extras']),
            'qtd_quitados' => $alunos->where('situacao', SituacaoFinanceira::Quitado->value)->count(),
            'qtd_parciais' => $alunos->where('situacao', SituacaoFinanceira::Parcial->value)->count(),
            'qtd_pendentes' => $alunos->where('situacao', SituacaoFinanceira::Pendente->value)->count(),
        ];
    }
}

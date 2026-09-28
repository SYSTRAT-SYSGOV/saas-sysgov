<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Support\RegraNegocioException;
use Throwable;

/** Guias de recolhimento próprias, segunda via, baixa manual e lote anual (RF-22, RF-23; P03). */
final readonly class GuiaService
{
    public function __construct(
        private PrecoService $precos,
        private ParametroService $parametros,
    ) {}

    /** @param array<string, mixed> $dados */
    public function emitir(array $dados): Guia
    {
        return DB::transaction(function () use ($dados): Guia {
            $ano = (int) now()->year;
            $sequencia = Guia::where('numero', 'like', "%/{$ano}")->lockForUpdate()->count() + 1;

            return Guia::create($dados + ['numero' => "{$sequencia}/{$ano}", 'situacao' => 'emitida']);
        });
    }

    /** Guia de uma concessão pelo preço vigente do serviço. */
    public function emitirParaConcessao(Concessao $concessao, string $servico, ?int $exercicio = null, int $diasVencimento = 30): Guia
    {
        $titular = $concessao->concessionario()->firstOrFail();

        return $this->emitir([
            'origem_type' => 'concessao',
            'origem_id' => $concessao->id,
            'holder_id' => $titular->id,
            'contribuinte_nome' => $titular->nome,
            'servico' => $servico,
            'exercicio' => $exercicio,
            'valor_centavos' => $this->precos->valorVigente($servico, $exercicio ? CarbonImmutable::create($exercicio, 1, 1) : null),
            'vencimento' => today()->addDays($diasVencimento)->toDateString(),
        ]);
    }

    /** Segunda via vinculada à original, que passa a Cancelada; recusada para guia paga (RF-23). */
    public function segundaVia(Guia $original, ?string $vencimento = null): Guia
    {
        if ($original->situacao !== 'emitida') {
            throw new RegraNegocioException('guia.segunda_via_indisponivel', "Guia {$original->situacao} não admite segunda via.");
        }

        return DB::transaction(function () use ($original, $vencimento): Guia {
            $original->update(['situacao' => 'cancelada']);

            return $this->emitir($original->only([
                'origem_type', 'origem_id', 'holder_id', 'contribuinte_nome', 'servico', 'exercicio', 'valor_centavos',
            ]) + [
                'original_id' => $original->id,
                'vencimento' => $vencimento ?? today()->addDays(10)->toDateString(),
            ]);
        });
    }

    public function baixar(Guia $guia, string $pagoEm, int $valorPago, string $comprovante, ?int $autorId): Guia
    {
        if ($guia->situacao !== 'emitida') {
            throw new RegraNegocioException('guia.baixa_indisponivel', "Guia {$guia->situacao} não pode receber baixa.");
        }

        $guia->update([
            'situacao' => 'paga', 'pago_em' => $pagoEm, 'valor_pago_centavos' => $valorPago,
            'comprovante_arquivo' => $comprovante, 'baixado_por' => $autorId,
        ]);

        return $guia;
    }

    /**
     * Taxa anual das concessões vigentes, idempotente por concessão/exercício:
     * reprocessar gera apenas o que faltou (RF-22).
     *
     * @return array{exercicio: int, geradas: int, existentes: int, falhas: list<array{concessao: string, erro: string}>}
     */
    public function loteAnual(int $exercicio): array
    {
        $relatorio = ['exercicio' => $exercicio, 'geradas' => 0, 'existentes' => 0, 'falhas' => []];

        Concessao::where('situacao', 'vigente')->where('sujeita_taxa_anual', true)->orderBy('id')
            ->each(function (Concessao $concessao) use ($exercicio, &$relatorio): void {
                $existe = Guia::where('origem_type', 'concessao')->where('origem_id', $concessao->id)
                    ->where('servico', 'taxa_manutencao_anual')->where('exercicio', $exercicio)->exists();

                if ($existe) {
                    $relatorio['existentes']++;

                    return;
                }

                try {
                    $this->emitirParaConcessao($concessao, 'taxa_manutencao_anual', $exercicio, 60);
                    $relatorio['geradas']++;
                } catch (Throwable $e) {
                    $relatorio['falhas'][] = ['concessao' => $concessao->numero, 'erro' => $e->getMessage()];
                }
            });

        return $relatorio;
    }

    /** @return list<string> */
    public function linhasPdf(Guia $guia): array
    {
        $p = $this->parametros->vigente();

        return array_values(array_filter([
            "Número: {$guia->numero}",
            "Contribuinte: {$guia->contribuinte_nome}",
            'Serviço: ' . str_replace('_', ' ', $guia->servico) . ($guia->exercicio ? " — exercício {$guia->exercicio}" : ''),
            'Valor: ' . PrecoService::brl($guia->valor_centavos),
            'Vencimento: ' . $guia->vencimento->format('d/m/Y'),
            'Situação: ' . mb_strtoupper($guia->vencida ? 'vencida' : $guia->situacao),
            $guia->original_id ? 'Segunda via da guia #' . $guia->original_id : null,
            '',
            'INSTRUÇÕES DE PAGAMENTO',
            $p->instrucoes_pagamento ?? '-',
            $p->chave_pix ? "Chave PIX do município: {$p->chave_pix}" : null,
            $guia->vencida ? 'Guia vencida: solicite a segunda via antes de pagar.' : null,
        ], fn ($l) => $l !== null));
    }
}

<?php

namespace Modules\Capd\Services\Adapters;

use Modules\Capd\Contracts\AssiduacaoDados;
use Modules\Capd\Contracts\DisciplinaDados;
use Modules\Capd\Contracts\HrAdapterInterface;

/**
 * Adapter MANUAL para F1 e F2.
 *
 * Usado quando modo_f1 = 'manual' ou modo_f2 = 'manual' no ciclo.
 * Os dados são lançados diretamente pela chefia ou DRH via
 * FormularioLancamentoManualController → tabela capd_lancamentos_manuais.
 *
 * Este adapter apenas recupera o que foi pré-lançado manualmente.
 */
final class ManualHrAdapter implements HrAdapterInterface
{
    public function obterAssiduidade(
        int    $servidorId,
        int    $cicloId,
        string $cpf,
        string $dataInicio,
        string $dataFim,
    ): AssiduacaoDados {
        $lancamento = \DB::table('capd_lancamentos_manuais')
            ->where('ciclo_id', $cicloId)
            ->where('servidor_id', $servidorId)
            ->where('fator_codigo', 'F1')
            ->first();

        if (! $lancamento) {
            // Retorna grau neutro (3 = Regular) enquanto não há lançamento
            return new AssiduacaoDados(
                faltasInjustificadas:  0,
                atrasosTolerados:      0,
                atrasosInjustificados: 0,
                grauCalculado:         3,
                notaCalculada:         '5.00',
                observacao:            'Aguardando lançamento manual pelo DRH.',
            );
        }

        return new AssiduacaoDados(
            faltasInjustificadas:  $lancamento->faltas_injustificadas,
            atrasosTolerados:      0,
            atrasosInjustificados: $lancamento->atrasos_injustificados,
            grauCalculado:         $lancamento->grau_calculado,
            notaCalculada:         $lancamento->nota_calculada,
            observacao:            $lancamento->observacao,
        );
    }

    public function obterDisciplina(
        int    $servidorId,
        int    $cicloId,
        string $cpf,
        string $dataInicio,
        string $dataFim,
    ): DisciplinaDados {
        $lancamento = \DB::table('capd_lancamentos_manuais')
            ->where('ciclo_id', $cicloId)
            ->where('servidor_id', $servidorId)
            ->where('fator_codigo', 'F2')
            ->first();

        if (! $lancamento) {
            return new DisciplinaDados(
                penalidades:          0,
                tipoPenalidadeMaxima: 0,
                grauCalculado:        3,
                notaCalculada:        '5.00',
                observacao:           'Aguardando lançamento manual pelo DRH.',
            );
        }

        return new DisciplinaDados(
            penalidades:          $lancamento->penalidades_disciplinares,
            tipoPenalidadeMaxima: $lancamento->penalidades_disciplinares,
            grauCalculado:        $lancamento->grau_calculado,
            notaCalculada:        $lancamento->nota_calculada,
            observacao:           $lancamento->observacao,
        );
    }

    public function identificador(): string
    {
        return 'manual';
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Support;

use Modules\Capd\Models\Servidor;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta do CAPD para `pessoas:conciliar capd` (unificar-pessoas-fase-2-capd). Desde a Fase 5 todo servidor tem pessoa e
 * CPF, nome social e nascimento só existem nela, então não há mais o que conciliar; a porta continua registrada porque
 * o relatório de adoção e a trava de remoção de colunas dependem do alias `capd`.
 */
final class ConciliacaoServidores implements ConciliacaoModuloInterface
{
    public function modulo(): string
    {
        return 'capd';
    }

    public function tabela(): string
    {
        return 'capd_servidores';
    }

    public function registros(): iterable
    {
        foreach (Servidor::query()->orderBy('id')->cursor() as $servidor) {
            yield new RegistroConciliacao(
                $servidor->id,
                $servidor->pessoa_id,
                null,
                ['nome' => $servidor->nome_completo],
                null,
                false, // servidor é adulto: pessoa pendente sem nascimento é aceita
            );
        }
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        Servidor::query()->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use Modules\Escola\Models\Aluno;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta do Cadastro Escolar para `pessoas:conciliar escola` (unificar-pessoas-fase-1-escola). Desde a Fase 5 todo aluno
 * tem pessoa e CPF e nascimento só existem nela, então não há mais o que conciliar; a porta continua registrada porque
 * o relatório de adoção e a trava de remoção de colunas dependem do alias `escola`.
 */
final class ConciliacaoAlunos implements ConciliacaoModuloInterface
{
    public function modulo(): string
    {
        return 'escola';
    }

    public function tabela(): string
    {
        return 'escola_alunos';
    }

    public function registros(): iterable
    {
        // Todas as escolas do tenant: o escopo por escola só vale dentro de uma requisição.
        $alunos = Aluno::query()->withoutGlobalScope('escola')->orderBy('id')->cursor();

        foreach ($alunos as $aluno) {
            yield new RegistroConciliacao(
                $aluno->id,
                $aluno->pessoa_id,
                null,
                [
                    'nome' => $aluno->nome,
                    'nome_mae' => $aluno->mae,
                    'nome_pai' => $aluno->pai,
                ],
                null,
            );
        }
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        Aluno::query()->withoutGlobalScope('escola')->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }
}

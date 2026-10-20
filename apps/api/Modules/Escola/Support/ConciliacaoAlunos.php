<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use Modules\Escola\Models\Aluno;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta do Cadastro Escolar para `pessoas:conciliar escola` (unificar-pessoas-fase-1-escola): concilia as
 * cópias de CPF, nome, nascimento e filiação de `escola_alunos` com o cadastro central.
 *
 * O aluno não guarda o responsável: menor sem CPF e sem pessoa vinculada sai no relatório como
 * `sem_responsavel` até que o responsável seja informado na ficha do aluno.
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
                $aluno->cpf,
                [
                    'nome' => $aluno->nome,
                    'data_nascimento' => $aluno->nascimento?->toDateString(),
                    'nome_mae' => $aluno->mae,
                    'nome_pai' => $aluno->pai,
                ],
            );
        }
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        Aluno::query()->withoutGlobalScope('escola')->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }
}

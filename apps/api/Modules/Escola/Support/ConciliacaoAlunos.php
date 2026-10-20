<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use Modules\Escola\Models\Aluno;
use Illuminate\Support\Str;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\RegistroConciliacao;

/**
 * Porta do Cadastro Escolar para `pessoas:conciliar escola` (unificar-pessoas-fase-1-escola): concilia as
 * cópias de CPF, nome, nascimento e filiação de `escola_alunos` com o cadastro central.
 *
 * O aluno não guarda o responsável. Para o menor sem CPF e sem pessoa vinculada, a mãe (ou, na falta dela, o pai)
 * que consta na ficha vira o responsável: é uma pessoa adulta com documento pendente, criada uma única vez por
 * nome (irmãos compartilham a mesma) ou reaproveitada se já existir pendente com o mesmo nome. Sem nome de mãe nem
 * de pai, o aluno sai no relatório como `sem_responsavel`. Quando a conciliação roda em `dry-run`, essas pessoas
 * são criadas dentro da transação que o serviço desfaz.
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

    /** @var array<string, int>|null pessoas pendentes já conhecidas, por nome normalizado */
    private ?array $responsaveis = null;

    public function registros(): iterable
    {
        $this->responsaveis = null;

        // Todas as escolas do tenant: o escopo por escola só vale dentro de uma requisição.
        $alunos = Aluno::query()->withoutGlobalScope('escola')->orderBy('id')->cursor();

        foreach ($alunos as $aluno) {
            $semPessoa = $aluno->pessoa_id === null && $aluno->cpf === null;

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
                $semPessoa ? $this->responsavelPelaFiliacao($aluno) : null,
            );
        }
    }

    /** Pessoa da mãe (ou do pai) do aluno, criada pendente se ainda não existir; `null` sem nome de filiação. */
    private function responsavelPelaFiliacao(Aluno $aluno): ?int
    {
        $nome = trim((string) ($aluno->mae ?: $aluno->pai));
        if ($nome === '') {
            return null;
        }

        if ($this->responsaveis === null) {
            $this->responsaveis = [];
            foreach (Pessoa::query()->where('tipo', 'fisica')->where('documento_pendente', true)->orderBy('id')->get() as $pessoa) {
                $this->responsaveis[$this->normalizar($pessoa->nome)] ??= $pessoa->id;
            }
        }

        $chave = $this->normalizar($nome);

        return $this->responsaveis[$chave] ??= app(ResolucaoPessoaService::class)
            ->resolverSemDocumento(['nome' => $nome], 'escola', null, true, false)->id;
    }

    private function normalizar(string $nome): string
    {
        return (string) preg_replace('/\s+/', ' ', mb_strtolower(trim(Str::ascii($nome))));
    }

    public function vincular(int $registroId, int $pessoaId): void
    {
        Aluno::query()->withoutGlobalScope('escola')->whereKey($registroId)->update(['pessoa_id' => $pessoaId]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Carbon;
use Modules\Escola\Models\Aluno;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\ResolucaoPessoaService;

/**
 * Liga o aluno ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D5).
 *
 * - Aluno com CPF → pessoa do município com esse CPF (criada se não existir) e vínculo `aluno`
 *   aberto com escola, aluno, CGM e turma.
 * - Pessoa é a fonte dos dados civis: ao ligar, o aluno recebe os dados da pessoa; editar nome,
 *   nascimento, mãe ou pai de um aluno já ligado grava na pessoa. O aluno guarda uma cópia de
 *   exibição (busca, ordenação, boletins, atas), atualizada pelo evento PessoaAtualizada.
 * - Transferência, exclusão ou remoção do CPF encerram o vínculo da escola.
 */
final class AlunoPessoaService
{
    /** Campo do aluno → campo da pessoa. */
    private const MAPA = ['nome' => 'nome', 'nascimento' => 'data_nascimento', 'mae' => 'nome_mae', 'pai' => 'nome_pai'];

    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Chamar depois de gravar o aluno (dentro da mesma transação).
     *
     * @param list<string> $camposCivisEditados campos civis enviados nesta gravação
     */
    public function sincronizar(Aluno $aluno, array $camposCivisEditados = []): void
    {
        $pessoaAnterior = $aluno->pessoa_id;

        if ($aluno->cpf === null) {
            if ($pessoaAnterior !== null) {
                $this->encerrarVinculo($aluno);
                $aluno->forceFill(['pessoa_id' => null])->save();
            }

            return;
        }

        $pessoa = $this->resolucao->resolverPorCpf($aluno->cpf, $this->dadosCivisDoAluno($aluno), 'escola');

        if ($pessoaAnterior === $pessoa->id) {
            // Já ligado: o que foi editado no aluno vale para a pessoa (fonte dos dados civis).
            $alteracoes = [];
            foreach ($camposCivisEditados as $campoAluno) {
                if (isset(self::MAPA[$campoAluno])) {
                    $alteracoes[self::MAPA[$campoAluno]] = $this->valorDoAluno($aluno, $campoAluno);
                }
            }
            if (($alteracoes['nome'] ?? '') === '') {
                unset($alteracoes['nome']); // nome é obrigatório na pessoa: nunca apaga
            }
            if ($alteracoes !== []) {
                $pessoa->update($alteracoes);
            }
        } else {
            if ($pessoaAnterior !== null) {
                $this->encerrarVinculo($aluno);
            }
            $aluno->forceFill(['pessoa_id' => $pessoa->id])->save();
            $this->audit->record('escola', 'aluno.pessoa_ligada', "aluno:{$aluno->id}", ['pessoa_id' => $pessoaAnterior], ['pessoa_id' => $pessoa->id]);
        }

        $this->copiarDadosCivis($aluno, $pessoa->refresh());
        $this->garantirVinculoAberto($aluno, $pessoa);
    }

    /** Encerra o vínculo `aluno` desta escola (transferência ou exclusão do aluno). */
    public function encerrarVinculo(Aluno $aluno): void
    {
        $vinculo = $this->vinculoAberto($aluno);
        if ($vinculo !== null) {
            $vinculo->update(['fim' => Carbon::today()]);
        }
    }

    /** Atualiza a cópia de exibição de todos os alunos ligados à pessoa (todas as escolas do tenant). */
    public function atualizarCopias(int $pessoaId, int $tenantId): void
    {
        $pessoa = Pessoa::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($pessoaId);
        if ($pessoa === null) {
            return;
        }

        Aluno::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('pessoa_id', $pessoaId)
            ->whereNull('deleted_at')
            ->get()
            ->each(fn (Aluno $aluno) => $this->copiarDadosCivis($aluno, $pessoa));
    }

    private function copiarDadosCivis(Aluno $aluno, Pessoa $pessoa): void
    {
        $aluno->forceFill([
            'nome' => (string) $pessoa->nome,
            'nascimento' => $pessoa->data_nascimento?->toDateString() ?? $aluno->nascimento?->toDateString(),
            'mae' => $pessoa->nome_mae ?? $aluno->mae,
            'pai' => $pessoa->nome_pai ?? $aluno->pai,
        ]);
        if ($aluno->isDirty()) {
            $aluno->save();
        }
    }

    private function garantirVinculoAberto(Aluno $aluno, Pessoa $pessoa): void
    {
        $dados = ['escola_id' => $aluno->escola_id, 'aluno_id' => $aluno->id, 'turma_id' => $aluno->turma_id];
        $vinculo = $this->vinculoAberto($aluno);

        if ($vinculo === null) {
            // tenant_id é protegido contra atribuição em massa no model: forceCreate.
            PessoaVinculo::query()->forceCreate([
                'tenant_id' => $aluno->tenant_id,
                'pessoa_id' => $pessoa->id,
                'tipo_vinculo' => 'aluno',
                'matricula' => $aluno->cgm,
                'dados' => $dados,
                'inicio' => Carbon::today(),
            ]);

            return;
        }

        $vinculo->update(['matricula' => $aluno->cgm, 'dados' => $dados]);
    }

    private function vinculoAberto(Aluno $aluno): ?PessoaVinculo
    {
        if ($aluno->pessoa_id === null) {
            return null;
        }

        return PessoaVinculo::withoutGlobalScopes()
            ->where('tenant_id', $aluno->tenant_id)
            ->where('pessoa_id', $aluno->pessoa_id)
            ->where('tipo_vinculo', 'aluno')
            ->whereNull('fim')
            ->get()
            ->first(fn (PessoaVinculo $v): bool => (int) ($v->dados['aluno_id'] ?? 0) === $aluno->id);
    }

    /** @return array{nome: string, data_nascimento: string|null, nome_mae: string|null, nome_pai: string|null} */
    private function dadosCivisDoAluno(Aluno $aluno): array
    {
        return [
            'nome' => $aluno->nome,
            'data_nascimento' => $aluno->nascimento?->toDateString(),
            'nome_mae' => $aluno->mae,
            'nome_pai' => $aluno->pai,
        ];
    }

    private function valorDoAluno(Aluno $aluno, string $campo): ?string
    {
        return $campo === 'nascimento' ? $aluno->nascimento?->toDateString() : $aluno->getAttribute($campo);
    }
}

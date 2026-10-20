<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Carbon;
use Modules\Escola\Models\Aluno;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;
use Modules\Pessoas\Support\RegraNegocioException;

/**
 * Liga o aluno ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D5).
 *
 * - Aluno com CPF → pessoa do município com esse CPF (criada se não existir) e vínculo `aluno`
 *   aberto com escola, aluno, CGM e turma.
 * - Aluno sem CPF → pessoa com documento pendente (unificar-pessoas-fase-1-escola); menor exige
 *   responsável e nome + nascimento iguais a uma pessoa existente são sugeridos antes de criar. Ao
 *   informar o CPF depois, a pessoa é regularizada e mantém o identificador.
 * - Pessoa é a fonte dos dados civis: ao ligar, o aluno recebe os dados da pessoa; editar nome,
 *   nascimento, mãe ou pai de um aluno já ligado grava na pessoa. O aluno guarda uma cópia de
 *   exibição (busca, ordenação, boletins, atas), atualizada pelo evento PessoaAtualizada.
 * - Transferência, exclusão ou remoção do CPF encerram o vínculo da escola.
 */
final class AlunoPessoaService
{
    /** Campo do aluno → campo da pessoa. */
    /** Recusas do MDM que não impedem editar aluno legado sem pessoa. */
    private const ADIAVEIS = ['dados_insuficientes', 'responsavel_obrigatorio', 'pessoa_semelhante_existente'];

    private const MAPA = ['nome' => 'nome', 'nascimento' => 'data_nascimento', 'mae' => 'nome_mae', 'pai' => 'nome_pai'];

    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly PessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Chamar depois de gravar o aluno (dentro da mesma transação).
     *
     * @param list<string> $camposCivisEditados campos civis enviados nesta gravação
     * @param int|null $responsavelId responsável (pessoa física) do aluno menor sem CPF
     * @param bool $confirmarNovo cria a pessoa mesmo havendo outra com o mesmo nome e nascimento
     * @param bool $exigirPessoa false (edição de aluno legado, sem pessoa): se faltar dado, responsável ou
     *        houver pessoa semelhante, o aluno segue sem pessoa até a conciliação, em vez de bloquear a edição
     *
     * @throws \Modules\Pessoas\Support\RegraNegocioException sem CPF: dados insuficientes, responsável
     *         obrigatório ou pessoa semelhante existente
     */
    public function sincronizar(Aluno $aluno, array $camposCivisEditados = [], ?int $responsavelId = null, bool $confirmarNovo = false, bool $exigirPessoa = true): void
    {
        $pessoaAnterior = $aluno->pessoa_id;
        try {
            $pessoa = $this->resolverPessoa($aluno, $responsavelId, $confirmarNovo);
        } catch (RegraNegocioException $e) {
            if ($exigirPessoa || ! in_array($e->codigo, self::ADIAVEIS, true)) {
                throw $e;
            }

            return;
        }

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

    private function resolverPessoa(Aluno $aluno, ?int $responsavelId, bool $confirmarNovo): Pessoa
    {
        $atual = $aluno->pessoa_id !== null ? Pessoa::query()->find($aluno->pessoa_id) : null;

        if ($aluno->cpf !== null) {
            if ($atual?->documento_pendente === true && ! Pessoa::withTrashed()->where('tipo', 'fisica')->where('documento_hash', Documento::hash($aluno->cpf))->exists()) {
                return $this->pessoas->regularizarDocumento($atual, $aluno->cpf);
            }

            return $this->resolucao->resolverPorCpf($aluno->cpf, $this->dadosCivisDoAluno($aluno), 'escola');
        }

        if ($atual !== null) {
            return $atual;
        }
        if (! $confirmarNovo && $aluno->nome !== '' && $aluno->nascimento !== null) {
            // Primeiro as semelhantes: o responsável só importa se for mesmo uma pessoa nova.
            $this->resolucao->exigirSemSemelhantes($aluno->nome, $aluno->nascimento->toDateString());
        }

        return $this->resolucao->resolverSemDocumento($this->dadosCivisDoAluno($aluno), 'escola', $responsavelId, $confirmarNovo);
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

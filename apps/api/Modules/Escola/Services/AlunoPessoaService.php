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

/**
 * Liga o aluno ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D5).
 *
 * - Todo aluno tem pessoa (`pessoa_id` obrigatório desde a Fase 5): a pessoa é resolvida antes de gravar o aluno novo.
 * - Aluno com CPF → pessoa do município com esse CPF (criada se não existir) e vínculo `aluno`
 *   aberto com escola, aluno, CGM e turma.
 * - Aluno sem CPF → pessoa com documento pendente (unificar-pessoas-fase-1-escola); menor exige
 *   responsável e nome + nascimento iguais a uma pessoa existente são sugeridos antes de criar. Ao
 *   informar o CPF depois, a pessoa é regularizada e mantém o identificador.
 * - CPF e nascimento vivem só na pessoa: chegam aqui como `$civis` e nunca são gravados no aluno.
 * - Editar nome, nascimento, mãe ou pai de um aluno já ligado grava na pessoa. O aluno guarda uma cópia de
 *   exibição de nome, mãe e pai (busca, ordenação, boletins, atas), atualizada pelo evento PessoaAtualizada.
 * - Transferência e exclusão encerram o vínculo da escola.
 */
final class AlunoPessoaService
{
    /** Campo do aluno → campo da pessoa. */
    private const MAPA = ['nome' => 'nome', 'nascimento' => 'data_nascimento', 'mae' => 'nome_mae', 'pai' => 'nome_pai'];

    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly PessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Resolve (ou cria) a pessoa de um aluno que ainda não foi gravado.
     *
     * @param array{nome?: string|null, cpf?: string|null, nascimento?: string|null, mae?: string|null, pai?: string|null} $civis
     * @param int|null $responsavelId responsável (pessoa física) do aluno menor sem CPF
     * @param bool $confirmarNovo cria a pessoa mesmo havendo outra com o mesmo nome e nascimento
     *
     * @throws \Modules\Pessoas\Support\RegraNegocioException sem CPF: dados insuficientes, responsável
     *         obrigatório ou pessoa semelhante existente
     */
    public function resolverParaNovo(array $civis, ?int $responsavelId = null, bool $confirmarNovo = false): Pessoa
    {
        return $this->resolverPessoa(null, $civis, $responsavelId, $confirmarNovo);
    }

    /** Depois de gravar o aluno novo (já com `pessoa_id`): cópia de exibição e vínculo funcional. */
    public function concluirCadastro(Aluno $aluno, Pessoa $pessoa): void
    {
        $this->audit->record('escola', 'aluno.pessoa_ligada', "aluno:{$aluno->id}", ['pessoa_id' => null], ['pessoa_id' => $pessoa->id]);
        $this->copiarDadosCivis($aluno, $pessoa->refresh());
        $this->garantirVinculoAberto($aluno, $pessoa);
    }

    /**
     * Chamar depois de gravar a edição do aluno (dentro da mesma transação).
     *
     * @param array{cpf?: string|null, nascimento?: string|null} $civis CPF e nascimento enviados nesta gravação
     * @param list<string> $camposCivisEditados campos civis enviados nesta gravação (nome, nascimento, mae, pai)
     * @param int|null $responsavelId responsável (pessoa física) usado se o CPF levar a uma pessoa nova sem documento
     * @param bool $confirmarNovo cria a pessoa mesmo havendo outra com o mesmo nome e nascimento
     *
     * @throws \Modules\Pessoas\Support\RegraNegocioException quando o CPF informado não pode ser resolvido
     */
    public function sincronizar(Aluno $aluno, array $civis = [], array $camposCivisEditados = [], ?int $responsavelId = null, bool $confirmarNovo = false): void
    {
        $pessoaAnterior = $aluno->pessoa_id;
        $pessoa = $this->resolverPessoa(Pessoa::query()->find($pessoaAnterior), $civis, $responsavelId, $confirmarNovo, $aluno);

        if ($pessoaAnterior === $pessoa->id) {
            // Já ligado: o que foi editado no aluno vale para a pessoa (fonte dos dados civis).
            $alteracoes = [];
            foreach ($camposCivisEditados as $campoAluno) {
                if (isset(self::MAPA[$campoAluno])) {
                    $alteracoes[self::MAPA[$campoAluno]] = $campoAluno === 'nascimento' ? ($civis['nascimento'] ?? null) : $aluno->getAttribute($campoAluno);
                }
            }
            if (($alteracoes['nome'] ?? '') === '') {
                unset($alteracoes['nome']); // nome é obrigatório na pessoa: nunca apaga
            }
            if ($alteracoes !== []) {
                $pessoa->update($alteracoes);
            }
        } else {
            $this->encerrarVinculo($aluno);
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

    /**
     * @param array{nome?: string|null, cpf?: string|null, nascimento?: string|null, mae?: string|null, pai?: string|null} $civis
     * @param Aluno|null $aluno aluno já gravado: o que não veio em `$civis` (nome, mãe, pai) é lido dele
     */
    private function resolverPessoa(?Pessoa $atual, array $civis, ?int $responsavelId, bool $confirmarNovo, ?Aluno $aluno = null): Pessoa
    {
        $cpf = ($civis['cpf'] ?? null) !== null && $civis['cpf'] !== '' ? Documento::somenteDigitos((string) $civis['cpf']) : null;
        $nome = (string) ($civis['nome'] ?? $aluno->nome ?? '');
        $nascimento = ($civis['nascimento'] ?? null) ?: $atual?->data_nascimento?->toDateString();
        $dadosCivis = [
            'nome' => $nome,
            'data_nascimento' => $nascimento,
            'nome_mae' => $civis['mae'] ?? $aluno?->mae,
            'nome_pai' => $civis['pai'] ?? $aluno?->pai,
        ];

        if ($cpf !== null) {
            if ($atual?->documento_pendente === true && ! Pessoa::withTrashed()->where('tipo', 'fisica')->where('documento_hash', Documento::hash($cpf))->exists()) {
                return $this->pessoas->regularizarDocumento($atual, $cpf);
            }

            return $this->resolucao->resolverPorCpf($cpf, $dadosCivis, 'escola');
        }

        if ($atual !== null) {
            return $atual;
        }
        if (! $confirmarNovo && $nome !== '' && $nascimento !== null) {
            // Primeiro as semelhantes: o responsável só importa se for mesmo uma pessoa nova.
            $this->resolucao->exigirSemSemelhantes($nome, $nascimento);
        }

        return $this->resolucao->resolverSemDocumento($dadosCivis, 'escola', $responsavelId, $confirmarNovo);
    }

    private function copiarDadosCivis(Aluno $aluno, Pessoa $pessoa): void
    {
        $aluno->forceFill([
            'nome' => (string) $pessoa->nome,
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
        return PessoaVinculo::withoutGlobalScopes()
            ->where('tenant_id', $aluno->tenant_id)
            ->where('pessoa_id', $aluno->pessoa_id)
            ->where('tipo_vinculo', 'aluno')
            ->whereNull('fim')
            ->get()
            ->first(fn (PessoaVinculo $v): bool => (int) ($v->dados['aluno_id'] ?? 0) === $aluno->id);
    }
}

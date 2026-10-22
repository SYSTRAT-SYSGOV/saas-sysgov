<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use Modules\Capd\Models\Servidor;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;

/**
 * Liga o servidor do CAPD ao Cadastro de Pessoas (unificar-pessoas-fase-2-capd).
 *
 * - Todo servidor tem pessoa (`pessoa_id` obrigatório desde a Fase 5): a pessoa é resolvida antes de gravar o servidor novo.
 * - CPF válido → pessoa do município com esse CPF (criada se não existir), sem sobrescrever o que já está
 *   cadastrado; sem CPF válido (ausente, malformado ou o `000.000.000-00` que a integração de RH grava) →
 *   pessoa com documento pendente, para o registro nunca ser descartado.
 * - CPF, nome social e nascimento vivem só na pessoa: chegam aqui como `$civis` e nunca são gravados no servidor.
 * - Matrícula e cargo ficam como vínculo funcional da pessoa; o CAPD guarda só o domínio da avaliação.
 * - O que o usuário edita no servidor (nome, nome social, nascimento) vale para a pessoa; a sincronização de
 *   RH nunca sobrescreve a pessoa. O `nome_completo` do servidor é cópia de exibição (busca e ordenação), atualizada
 *   pela pessoa.
 */
final class ServidorPessoaService
{
    /** Campo do servidor → campo da pessoa. */
    private const MAPA = ['nome_completo' => 'nome', 'nome_social' => 'nome_social', 'data_nascimento' => 'data_nascimento'];

    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly PessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Resolve (ou cria) a pessoa de um servidor que ainda não foi gravado.
     *
     * @param array{nome?: string|null, cpf?: string|null, nome_social?: string|null, data_nascimento?: string|null} $civis
     */
    public function resolverParaNovo(array $civis): Pessoa
    {
        return $this->resolverPessoa(null, $civis);
    }

    /** Depois de gravar o servidor novo (já com `pessoa_id`): cópia de exibição e vínculo funcional. */
    public function concluirCadastro(Servidor $servidor, Pessoa $pessoa): void
    {
        $this->audit->record('capd', 'servidor.pessoa_ligada', "servidor:{$servidor->id}", ['pessoa_id' => null], ['pessoa_id' => $pessoa->id]);
        $this->copiarDadosCivis($servidor, $pessoa->refresh());
        $this->garantirVinculo($servidor, $pessoa);
    }

    /**
     * Chamar depois de gravar a edição do servidor (dentro da mesma transação).
     *
     * @param array{cpf?: string|null, nome_social?: string|null, data_nascimento?: string|null} $civis CPF, nome social
     *        e nascimento enviados nesta gravação
     * @param list<string> $camposCivisEditados campos civis enviados pelo usuário nesta gravação (nunca pela integração)
     */
    public function sincronizar(Servidor $servidor, array $civis = [], array $camposCivisEditados = []): void
    {
        $anterior = $servidor->pessoa_id;
        $pessoa = $this->resolverPessoa(Pessoa::query()->find($anterior), $civis, $servidor);

        if ($anterior === $pessoa->id) {
            $alteracoes = [];
            foreach ($camposCivisEditados as $campo) {
                if (isset(self::MAPA[$campo])) {
                    $alteracoes[self::MAPA[$campo]] = $campo === 'nome_completo' ? $servidor->nome_completo : ($civis[$campo] ?? null);
                }
            }
            if (($alteracoes['nome'] ?? '') === '') {
                unset($alteracoes['nome']); // nome é obrigatório na pessoa: nunca apaga
            }
            if ($alteracoes !== []) {
                $pessoa->update($alteracoes);
            }
        } else {
            $servidor->forceFill(['pessoa_id' => $pessoa->id])->saveQuietly();
            $this->audit->record('capd', 'servidor.pessoa_ligada', "servidor:{$servidor->id}", ['pessoa_id' => $anterior], ['pessoa_id' => $pessoa->id]);
        }

        $this->copiarDadosCivis($servidor, $pessoa->refresh());
        $this->garantirVinculo($servidor, $pessoa);
    }

    /** Atualiza a cópia de exibição dos servidores ligados à pessoa. */
    public function atualizarCopias(int $pessoaId, int $tenantId): void
    {
        $pessoa = Pessoa::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($pessoaId);
        if ($pessoa === null) {
            return;
        }

        Servidor::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('pessoa_id', $pessoaId)
            ->whereNull('deleted_at')
            ->get()
            ->each(fn (Servidor $s) => $this->copiarDadosCivis($s, $pessoa));
    }

    /**
     * @param array{nome?: string|null, cpf?: string|null, nome_social?: string|null, data_nascimento?: string|null} $civis
     * @param Servidor|null $servidor servidor já gravado: o nome que não veio em `$civis` é lido dele
     */
    private function resolverPessoa(?Pessoa $atual, array $civis, ?Servidor $servidor = null): Pessoa
    {
        $cpf = self::cpfValido($civis['cpf'] ?? null);
        $dadosCivis = [
            'nome' => (string) ($civis['nome'] ?? $servidor->nome_completo ?? ''),
            'nome_social' => array_key_exists('nome_social', $civis) ? $civis['nome_social'] : $atual?->nome_social,
            'data_nascimento' => array_key_exists('data_nascimento', $civis) ? $civis['data_nascimento'] : $atual?->data_nascimento?->toDateString(),
        ];

        if ($cpf !== null) {
            if ($atual?->documento_pendente === true && ! Pessoa::withTrashed()->where('tipo', 'fisica')->where('documento_hash', Documento::hash($cpf))->exists()) {
                return $this->pessoas->regularizarDocumento($atual, $cpf);
            }

            return $this->resolucao->resolverPorCpf($cpf, $dadosCivis, 'capd');
        }

        return $atual ?? $this->resolucao->resolverSemDocumento($dadosCivis, 'capd', null, true, false);
    }

    /** CPF só com dígitos quando válido; `null` para ausente, malformado ou o `000.000.000-00` de preenchimento. */
    public static function cpfValido(?string $cpf): ?string
    {
        $digitos = Documento::somenteDigitos((string) $cpf);

        return $digitos !== '' && ! preg_match('/^(\d)\1{10}$/', $digitos) && Documento::valido($digitos) ? $digitos : null;
    }

    private function copiarDadosCivis(Servidor $servidor, Pessoa $pessoa): void
    {
        $servidor->forceFill(['nome_completo' => (string) $pessoa->nome]);
        if ($servidor->isDirty()) {
            $servidor->saveQuietly();
        }
    }

    private function garantirVinculo(Servidor $servidor, Pessoa $pessoa): void
    {
        $tipo = in_array(strtolower((string) $servidor->regime_juridico), ['clt', 'celetista'], true) ? 'clt' : 'servidor_carreira';
        $dados = ['servidor_id' => $servidor->id, 'cargo' => $servidor->cargo_efetivo, 'orgao_lotacao' => $servidor->orgao_lotacao];

        $vinculo = PessoaVinculo::withoutGlobalScopes()
            ->where('tenant_id', $servidor->tenant_id)
            ->where('pessoa_id', $pessoa->id)
            ->whereNull('fim')
            ->get()
            ->first(fn (PessoaVinculo $v): bool => (int) ($v->dados['servidor_id'] ?? 0) === $servidor->id);

        if ($vinculo === null) {
            // tenant_id é protegido contra atribuição em massa no model: forceCreate.
            PessoaVinculo::query()->forceCreate([
                'tenant_id' => $servidor->tenant_id,
                'pessoa_id' => $pessoa->id,
                'tipo_vinculo' => $tipo,
                'matricula' => $servidor->matricula,
                'dados' => $dados,
                'inicio' => $servidor->data_exercicio ?? now()->toDateString(),
            ]);

            return;
        }

        $vinculo->update(['tipo_vinculo' => $tipo, 'matricula' => $servidor->matricula, 'dados' => $dados]);
    }
}

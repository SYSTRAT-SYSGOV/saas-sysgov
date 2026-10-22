<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\User;
use App\Support\AuditLogger;
use Modules\Capd\Models\Servidor;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;
use Modules\Pessoas\Models\PessoaUsuario;
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
 * - E-mail e telefone também: viram o contato principal da pessoa (`$contatos`). O usuário do sistema se liga ao servidor
 *   por `user_id` e pelo vínculo `pessoas_usuarios` da pessoa; o e-mail do contato só serve para achar o servidor
 *   de um usuário ainda não ligado.
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

    /**
     * Depois de gravar o servidor novo (já com `pessoa_id`): contatos, cópia de exibição e vínculo funcional.
     *
     * @param array{email?: string|null, telefone?: string|null} $contatos
     */
    public function concluirCadastro(Servidor $servidor, Pessoa $pessoa, array $contatos = []): void
    {
        $this->audit->record('capd', 'servidor.pessoa_ligada', "servidor:{$servidor->id}", ['pessoa_id' => null], ['pessoa_id' => $pessoa->id]);
        $this->gravarContatos($pessoa, $contatos);
        $this->copiarDadosCivis($servidor, $pessoa->refresh());
        $this->garantirVinculo($servidor, $pessoa);
    }

    /**
     * Chamar depois de gravar a edição do servidor (dentro da mesma transação).
     *
     * @param array{cpf?: string|null, nome_social?: string|null, data_nascimento?: string|null} $civis CPF, nome social
     *        e nascimento enviados nesta gravação
     * @param list<string> $camposCivisEditados campos civis enviados pelo usuário nesta gravação (nunca pela integração)
     * @param array{email?: string|null, telefone?: string|null} $contatos e-mail e telefone enviados nesta gravação
     */
    public function sincronizar(Servidor $servidor, array $civis = [], array $camposCivisEditados = [], array $contatos = []): void
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

        $this->gravarContatos($pessoa, $contatos);
        $this->copiarDadosCivis($servidor, $pessoa->refresh());
        $this->garantirVinculo($servidor, $pessoa);
    }

    /**
     * Servidor do usuário que ainda não está ligado por `user_id`: primeiro pelo vínculo `pessoas_usuarios` da pessoa,
     * depois pelo e-mail dos contatos da pessoa. Só adota servidor sem usuário; o achado fica ligado ao usuário.
     */
    public function servidorDoUsuario(User $user): ?Servidor
    {
        $ligado = PessoaUsuario::query()->where('user_id', $user->id)->first();
        $servidor = $ligado === null ? null : Servidor::query()->where('pessoa_id', $ligado->pessoa_id)->whereNull('user_id')->orderBy('id')->first();

        if ($servidor === null && trim((string) $user->email) !== '') {
            $email = mb_strtolower(trim((string) $user->email));
            $servidor = Servidor::query()
                ->whereNull('user_id')
                ->whereHas('pessoa.contatos', fn ($c) => $c->where('tipo', 'email')->whereRaw('LOWER(valor) = ?', [$email]))
                ->orderBy('id')
                ->first();
        }

        if ($servidor !== null) {
            $this->vincularUsuario($servidor, $user);
        }

        return $servidor;
    }

    /** Liga o usuário ao servidor (`user_id`) e à pessoa do servidor (`pessoas_usuarios`), sem tomar vínculo de outro. */
    public function vincularUsuario(Servidor $servidor, User $user): void
    {
        $servidor->forceFill(['user_id' => $user->id])->saveQuietly();

        $semVinculo = ! PessoaUsuario::query()->where('pessoa_id', $servidor->pessoa_id)->orWhere('user_id', $user->id)->exists();
        if ($semVinculo) {
            // tenant_id é protegido contra atribuição em massa no model: forceCreate.
            PessoaUsuario::query()->forceCreate([
                'tenant_id' => $servidor->tenant_id,
                'pessoa_id' => $servidor->pessoa_id,
                'user_id' => $user->id,
                'promovido_em' => now(),
            ]);
        }
    }

    /**
     * E-mail e telefone digitados no servidor valem para a pessoa: viram (ou atualizam) o contato principal do tipo.
     * Campo ausente ou vazio não apaga nada: os contatos são da pessoa e outros módulos os usam.
     *
     * @param array{email?: string|null, telefone?: string|null} $contatos
     */
    private function gravarContatos(Pessoa $pessoa, array $contatos): void
    {
        foreach (['email' => mb_strtolower(trim((string) ($contatos['email'] ?? ''))), 'telefone' => trim((string) ($contatos['telefone'] ?? ''))] as $tipo => $valor) {
            if ($valor === '') {
                continue;
            }

            $doTipo = $pessoa->contatos()->where('tipo', $tipo)->get();
            $igual = $doTipo->first(fn (PessoaContato $c): bool => mb_strtolower($c->valor) === mb_strtolower($valor));
            $principal = $doTipo->firstWhere('principal', true);

            if ($igual !== null) {
                if (! $igual->principal) {
                    $this->pessoas->atualizarContato($igual, ['principal' => true]);
                }
            } elseif ($principal !== null) {
                $this->pessoas->atualizarContato($principal, ['valor' => $valor]);
            } else {
                $this->pessoas->adicionarContato($pessoa, ['tipo' => $tipo, 'valor' => $valor, 'principal' => true]);
            }
        }
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

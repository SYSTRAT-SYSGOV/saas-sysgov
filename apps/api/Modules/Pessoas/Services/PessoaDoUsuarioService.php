<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;

/**
 * Todo usuário de um órgão (tenant) criado no admin passa a ter pessoa no Cadastro de Pessoas desse órgão.
 *
 * - Se o usuário já está ligado a uma pessoa (`pessoas_usuarios`), nada muda.
 * - Se há exatamente uma pessoa física do órgão, ainda sem usuário, com o e-mail do usuário entre os contatos, o
 *   usuário é ligado a ela (sem criar duplicada). Com mais de uma candidata não se adivinha: nada é ligado e o caso
 *   fica na auditoria, para decisão humana.
 * - Senão nasce uma pessoa física sem documento (`documento_pendente`) com o nome do usuário e o e-mail como contato
 *   principal, ligada ao usuário.
 *
 * O vínculo `pessoas_usuarios` é único por usuário: quem já está ligado a uma pessoa de outro órgão não ganha uma
 * segunda. Usuários da plataforma (Systrat) não passam por aqui. Falha ao montar a pessoa nunca impede o usuário.
 */
final class PessoaDoUsuarioService
{
    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly PessoaService $pessoas,
        private readonly AuditLogger $audit,
        private readonly TenantContext $contexto,
    ) {}

    /**
     * @param int|null $porUsuarioId quem criou o usuário (auditoria do vínculo)
     * @param string $origem de onde veio (aparece na auditoria)
     */
    public function garantir(User $user, Tenant $tenant, ?int $porUsuarioId = null, string $origem = 'admin'): ?Pessoa
    {
        if ($user->is_systrat) {
            return null;
        }

        try {
            return $this->noOrgao($tenant, fn (): ?Pessoa => $this->garantirNoOrgao($user, $tenant, $porUsuarioId, $origem));
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    private function garantirNoOrgao(User $user, Tenant $tenant, ?int $porUsuarioId, string $origem): ?Pessoa
    {
        // O vínculo é único por usuário em todos os órgãos: ligado em outro órgão, não ganha uma segunda pessoa.
        $ligado = PessoaUsuario::withoutGlobalScopes()->where('user_id', $user->id)->first();
        if ($ligado !== null) {
            return (int) $ligado->tenant_id === $tenant->id ? Pessoa::query()->find($ligado->pessoa_id) : null;
        }

        return DB::transaction(function () use ($user, $tenant, $porUsuarioId, $origem): ?Pessoa {
            $email = mb_strtolower(trim((string) $user->email));
            $candidatas = $email === '' ? collect() : Pessoa::query()
                ->where('tipo', 'fisica')
                ->whereDoesntHave('usuario')
                ->whereHas('contatos', fn ($c) => $c->where('tipo', 'email')->whereRaw('LOWER(valor) = ?', [$email]))
                ->limit(2)
                ->get();

            if ($candidatas->count() > 1) {
                $this->audit->record('pessoas', 'pessoa.usuario_ambiguo', "User #{$user->id}", null, ['origem' => $origem, 'pessoas' => $candidatas->pluck('id')->all()]);

                return null;
            }

            $pessoa = $candidatas->first();
            $nova = $pessoa === null;
            $pessoa ??= $this->criarPessoa($user, $email, $origem);

            // tenant_id é protegido contra atribuição em massa no model: forceCreate.
            PessoaUsuario::query()->forceCreate([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
                'user_id' => $user->id,
                'promovido_em' => now(),
                'promovido_por' => $porUsuarioId,
            ]);
            $this->audit->record('pessoas', $nova ? 'pessoa.criada_para_usuario' : 'pessoa.pareada_com_usuario', "Pessoa #{$pessoa->id}", null, ['pessoa_id' => $pessoa->id, 'user_id' => $user->id, 'origem' => $origem]);

            return $pessoa;
        });
    }

    private function criarPessoa(User $user, string $email, string $origem): Pessoa
    {
        $pessoa = $this->resolucao->resolverSemDocumento(['nome' => (string) $user->name], $origem, null, true, false, true);

        if ($email !== '' && ! $pessoa->contatos()->where('tipo', 'email')->exists()) {
            $this->pessoas->adicionarContato($pessoa, ['tipo' => 'email', 'valor' => $email, 'principal' => true]);
        }

        return $pessoa;
    }

    /** Roda no contexto do órgão e restaura o anterior (o admin pode estar criando usuário para outro órgão). */
    private function noOrgao(Tenant $tenant, \Closure $acao): mixed
    {
        $anterior = $this->contexto->hasTenant() ? $this->contexto->get() : null;
        $this->contexto->set($tenant);

        try {
            return $acao();
        } finally {
            $anterior !== null ? $this->contexto->set($anterior) : $this->contexto->clear();
        }
    }
}

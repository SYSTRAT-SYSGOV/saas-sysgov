<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Publico;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\UserService;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Providers\CursosServiceProvider;
use Modules\Cursos\Support\Cpf;

/**
 * Cadastro público do participante externo (design D6, D10) — os três caminhos do e-mail:
 * novo (cria tudo), já existe em outro órgão (só o vínculo novo, a senha do formulário é
 * descartada) e já vinculado a este órgão (nada muda, só orienta recuperar a senha). A resposta
 * ao cliente é sempre igual nos três casos — quem decide isso é o controller, não este serviço.
 */
final class CadastroExternoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly UserService $userService,
    ) {}

    /**
     * @param array{nome: string, email: string, senha: string, documento: string|null, aceite: bool} $dados
     */
    public function cadastrar(Tenant $tenant, array $dados): void
    {
        if ($dados['aceite'] !== true) {
            throw ValidationException::withMessages(['aceite' => 'É preciso aceitar o termo de uso para se cadastrar.']);
        }

        $documentoInformado = $dados['documento'] !== null && $dados['documento'] !== '';

        // "Exigir CPF no cadastro externo" (ConfiguracaoPublicaTab, tarefa 6.6) gravava o valor
        // em settings.cursos, mas nada aqui chegou a lê-lo pra validar de verdade — a inscrição
        // sempre tratava o CPF como opcional, mesmo com o órgão exigindo. Lido direto do tenant
        // (como OrgaoPublicoService já faz) pra não puxar ConfiguracaoPublicaService pra dentro
        // de Services\Publico (o teste de arquitetura só libera isso pra outros Services\Publico).
        if (!$documentoInformado && data_get($tenant->settings, 'cursos.documento_obrigatorio', false)) {
            throw ValidationException::withMessages(['documento' => 'CPF é obrigatório para se cadastrar neste órgão.']);
        }

        if ($documentoInformado && !Cpf::valido($dados['documento'])) {
            throw ValidationException::withMessages(['documento' => 'CPF inválido.']);
        }

        $chaveLimiteEmail = 'cursos-cadastro-email:' . sha1(mb_strtolower(trim($dados['email'])));

        if (RateLimiter::tooManyAttempts($chaveLimiteEmail, CursosServiceProvider::LIMITE_CADASTRO_EMAIL_POR_HORA)) {
            // Resposta sempre igual (D8): o limite por e-mail existe pra não encher a caixa de
            // outra pessoa, não pra revelar nada — quem excede não dispara nenhum e-mail novo.
            return;
        }

        RateLimiter::hit($chaveLimiteEmail, 3600);

        $usuario = User::where('email', $dados['email'])->first();

        if ($usuario && $usuario->tenants()->where('tenants.id', $tenant->id)->exists()) {
            // Já tem conta com vínculo neste órgão (ativo ou pending): nada muda aqui, só reaproveita
            // o fluxo de recuperação de senha que já existe (mesma resposta genérica dele).
            $this->userService->requestPasswordReset($dados['email']);

            return;
        }

        try {
            DB::transaction(function () use ($tenant, $dados, $usuario): void {
                $usuario ??= User::create([
                    'name' => $dados['nome'],
                    'email' => $dados['email'],
                    'password' => Hash::make($dados['senha']),
                    'is_active' => true,
                ]);
                // Se $usuario já existia (conta de outro órgão), a senha do formulário nunca é usada:
                // a pessoa continua entrando com a senha que já tinha (D6).

                $role = Role::where('slug', 'participante_externo_cursos')->where('tenant_id', $tenant->id)->firstOrFail();

                $usuario->tenants()->syncWithoutDetaching([
                    $tenant->id => ['role_id' => $role->id, 'status' => 'pending', 'is_primary' => true],
                ]);
                $usuario->roles()->syncWithoutDetaching([$role->id]);
                DB::table('role_user')->where('role_id', $role->id)->where('user_id', $usuario->id)->update(['tenant_id' => $tenant->id]);

                Participante::create([
                    'tenant_id' => $tenant->id,
                    'user_id' => $usuario->id,
                    'nome' => $dados['nome'],
                    'email' => $dados['email'],
                    'documento' => $dados['documento'],
                    'origem' => Participante::ORIGEM_EXTERNO,
                    'consentimento_em' => now(),
                    'termo_versao' => data_get($tenant->settings, 'cursos.termo.versao'),
                ]);

                $this->audit->record('cursos', 'cadastro_externo.criado', "User #{$usuario->id}", null, ['tenant_id' => $tenant->id, 'email' => $dados['email']]);

                // O e-mail leva o link de verificação (design D5): o tratador gera o token na hora do
                // envio, então o payload só precisa do user_id — o tenant já vai na coluna do evento.
                $this->outbox->publish('cursos.CadastroExternoCriado', ['user_id' => $usuario->id], $tenant->id);
            });
        } catch (QueryException $e) {
            // A checagem de e-mail duplicado em User::where(...)->first() acima roda fora da
            // transação (D8: não pode travar a linha de um e-mail que talvez nem exista ainda) —
            // duas requisições concorrentes com o mesmo e-mail novo podem passar as duas pela
            // checagem e colidir só aqui, no índice único de `users.email`. Perdedor da corrida
            // cai no mesmo caminho de "já tem conta" (resposta idêntica, D8) em vez de 500.
            if (!str_contains($e->getMessage(), 'users_email_unique') && !str_contains($e->getMessage(), 'users.email')) {
                throw $e;
            }

            $this->userService->requestPasswordReset($dados['email']);
        }
    }
}

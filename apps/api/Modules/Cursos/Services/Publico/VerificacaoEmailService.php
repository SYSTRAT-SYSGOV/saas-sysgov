<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Publico;

use App\Models\EmailVerificationToken;
use App\Models\Tenant;
use App\Models\User;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Verificação de e-mail do cadastro externo (design D5/D6) — token de uso único e validade de
 * 24h. Quem gera o token é o tratador de `cursos.CadastroExternoCriado` (Seção 5, na hora do
 * envio); este serviço só consome o token e, pra pedir um novo link, publica o mesmo evento de
 * novo (o tratador de lá vai gerar outro token e mandar outro e-mail).
 */
final class VerificacaoEmailService
{
    public function __construct(private readonly OutboxPublisher $outbox) {}

    public function verificar(string $token): void
    {
        $registro = EmailVerificationToken::where('token_hash', hash('sha256', $token))->first();

        if (!$registro) {
            throw ValidationException::withMessages(['token' => 'Link de verificação inválido.']);
        }

        if ($registro->used_at !== null) {
            throw ValidationException::withMessages(['token' => 'Este link já foi usado. Se ainda não conseguiu entrar, peça um novo.']);
        }

        if ($registro->expires_at->isPast()) {
            throw ValidationException::withMessages(['token' => 'Link de verificação vencido. Peça um novo.']);
        }

        DB::transaction(function () use ($registro): void {
            $registro->update(['used_at' => now()]);
            DB::table('tenant_user')
                ->where('user_id', $registro->user_id)
                ->where('tenant_id', $registro->tenant_id)
                ->update(['status' => 'active']);
        });
    }

    /**
     * Resposta sempre igual (o controller decide isso), pra não revelar se o e-mail existe.
     */
    public function pedirNovoLink(Tenant $tenant, string $email): void
    {
        $usuario = User::where('email', $email)->first();
        if (!$usuario) {
            return;
        }

        $pendente = DB::table('tenant_user')
            ->where('user_id', $usuario->id)
            ->where('tenant_id', $tenant->id)
            ->where('status', 'pending')
            ->exists();

        if (!$pendente) {
            return;
        }

        $this->outbox->publish('cursos.CadastroExternoCriado', ['user_id' => $usuario->id], $tenant->id);
    }
}

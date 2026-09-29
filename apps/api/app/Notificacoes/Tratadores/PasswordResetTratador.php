<?php

declare(strict_types=1);

namespace App\Notificacoes\Tratadores;

use App\Mail\PasswordResetMail;
use App\Models\OutboxEvent;
use App\Models\User;
use App\Notificacoes\Mensagem;
use App\Notificacoes\ResolvedorIdentidade;
use App\Notificacoes\Tratador;

/**
 * Tratador de `PasswordResetRequested` (tarefa 1.6, design D5). O evento nunca tem tenant (a
 * rota de "esqueci minha senha" é pública, sem `TenantContext`), então usa sempre a identidade
 * padrão do SYSGOV. Se o usuário do `payload` não existir mais ou não tiver e-mail, não há nada
 * a enviar — `UserService::requestPasswordReset` já garante que só publica o evento quando o
 * e-mail existe, então isso só cobre uma eventual inconsistência entre o publish e o processo.
 */
final class PasswordResetTratador implements Tratador
{
    /** Substitui o token em claro no payload depois do envio (D5) — nunca é um token de verdade. */
    public const string TOKEN_ENVIADO = '[enviado]';

    public function __construct(private readonly ResolvedorIdentidade $resolvedorIdentidade) {}

    public function tratar(OutboxEvent $evento): array
    {
        $token = $evento->payload['token'] ?? null;
        if ($token === null || $token === self::TOKEN_ENVIADO) {
            return [];
        }

        $userId = $evento->payload['user_id'] ?? null;
        $user = $userId !== null ? User::find($userId) : null;
        if ($user === null || empty($user->email)) {
            return [];
        }

        $identidade = $this->resolvedorIdentidade->resolver(null);
        $link = rtrim((string) config('app.portal_url'), '/') . '/redefinir-senha?token=' . urlencode($token);
        $mailable = new PasswordResetMail($identidade, $user->name, $link);

        return [new Mensagem('redefinicao_senha', $user->email, $mailable, fn () => $this->apagarToken($evento))];
    }

    private function apagarToken(OutboxEvent $evento): void
    {
        $payload = $evento->payload;
        if (($payload['token'] ?? null) === self::TOKEN_ENVIADO) {
            return;
        }
        $payload['token'] = self::TOKEN_ENVIADO;
        $evento->update(['payload' => $payload]);
    }
}

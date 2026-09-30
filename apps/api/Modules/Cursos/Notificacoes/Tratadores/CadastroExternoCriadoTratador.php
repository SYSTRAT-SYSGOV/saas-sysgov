<?php

declare(strict_types=1);

namespace Modules\Cursos\Notificacoes\Tratadores;

use App\Models\EmailVerificationToken;
use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Notificacoes\Mensagem;
use App\Notificacoes\ResolvedorIdentidade;
use App\Notificacoes\Tratador;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cursos\Mail\CadastroExternoVerificacaoMail;

/**
 * Tratador de `cursos.CadastroExternoCriado` (tarefa 5.1, design D5) — o evento leva só
 * `user_id`; o TOKEN é gerado aqui, na hora do envio, pra nunca ficar em claro no `payload` do
 * Outbox (diferente da redefinição de senha, que é contrato existente do `UserService`).
 */
final class CadastroExternoCriadoTratador implements Tratador
{
    public const string TIPO = 'verificacao_cadastro_externo';

    public function __construct(private readonly ResolvedorIdentidade $resolvedorIdentidade) {}

    public function tratar(OutboxEvent $evento): array
    {
        // Já enviado numa tentativa anterior deste MESMO evento: não gera outro token, que
        // invalidaria pra ninguém o link que a pessoa já recebeu (D5). Uma tentativa que ainda
        // não chegou a enviar (ex.: falhou no meio) pode gerar um token novo sem problema — só
        // um chega a ser usado de verdade, o outro fica sem uso até expirar.
        $jaEnviado = NotificacaoEnvio::where('event_id', $evento->event_id)
            ->where('tipo', self::TIPO)
            ->where('situacao', 'enviado')
            ->exists();
        if ($jaEnviado) {
            return [];
        }

        $userId = $evento->payload['user_id'] ?? null;
        $user = $userId !== null ? User::find($userId) : null;
        if ($user === null || empty($user->email)) {
            return [];
        }

        $tenant = $evento->tenant_id !== null ? Tenant::find($evento->tenant_id) : null;
        if ($tenant === null) {
            return [];
        }

        $vinculoPendente = DB::table('tenant_user')
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenant->id)
            ->where('status', 'pending')
            ->exists();
        if (!$vinculoPendente) {
            // Já verificou (ou o vínculo nunca existiu/foi removido) — link de verificação não
            // faz mais sentido.
            return [];
        }

        $tokenClaro = Str::random(64);
        EmailVerificationToken::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'token_hash' => hash('sha256', $tokenClaro),
            'expires_at' => now()->addHours(24),
        ]);

        $identidade = $this->resolvedorIdentidade->resolver($tenant);
        $link = rtrim((string) config('app.portal_url'), '/') . '/verificar-email?token=' . urlencode($tokenClaro);
        $mailable = new CadastroExternoVerificacaoMail($identidade, $user->name, $link);

        return [new Mensagem(self::TIPO, $user->email, $mailable)];
    }
}

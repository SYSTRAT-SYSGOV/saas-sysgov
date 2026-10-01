<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\User;
use App\Notificacoes\Tratadores\PasswordResetTratador;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tratador de PasswordResetRequested (tarefa 1.6, design D5): a recuperação de senha finalmente
 * entrega o e-mail — o evento já era publicado desde a Fase 1, mas ninguém o consumia.
 */
final class PasswordResetTratadorTest extends TestCase
{
    use RefreshDatabase;

    public function test_link_de_redefinicao_recebido(): void
    {
        $user = User::create(['name' => 'Ana Souza', 'email' => 'ana@teste.gov.br', 'password' => bcrypt('x')]);

        app(UserService::class)->requestPasswordReset($user->email);
        $evento = OutboxEvent::query()->where('event_type', 'PasswordResetRequested')->sole();
        $tokenOriginal = $evento->payload['token'];

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::query()->sole();
        $this->assertSame('enviado', $envio->situacao);
        $this->assertSame('ana@teste.gov.br', $envio->destinatario);
        $this->assertSame('redefinicao_senha', $envio->tipo);

        // D5: o token em claro não pode continuar no Outbox depois do envio.
        $evento->refresh();
        $this->assertSame(PasswordResetTratador::TOKEN_ENVIADO, $evento->payload['token']);
        $this->assertNotSame($tokenOriginal, $evento->payload['token']);
    }

    public function test_o_link_usa_o_portal_url_e_o_token_de_verdade(): void
    {
        config(['app.portal_url' => 'https://portal.exemplo.gov.br']);
        $user = User::create(['name' => 'Bruno Lima', 'email' => 'bruno@teste.gov.br', 'password' => bcrypt('x')]);
        $evento = OutboxEvent::create(['event_type' => 'PasswordResetRequested', 'event_version' => 1, 'payload' => ['user_id' => $user->id, 'token' => 'token-de-verdade-123'], 'status' => 'pending', 'available_at' => now()]);

        $mensagens = app(PasswordResetTratador::class)->tratar($evento);

        $this->assertCount(1, $mensagens);
        $html = $mensagens[0]->mailable->render();
        $this->assertStringContainsString('https://portal.exemplo.gov.br/redefinir-senha?token=token-de-verdade-123', $html);
    }

    public function test_email_nao_cadastrado_nao_publica_nada(): void
    {
        app(UserService::class)->requestPasswordReset('inexistente@teste.gov.br');

        $this->assertSame(0, OutboxEvent::query()->count());
    }

    public function test_evento_com_token_ja_enviado_nao_gera_mensagem(): void
    {
        $user = User::create(['name' => 'Carla Dias', 'email' => 'carla@teste.gov.br', 'password' => bcrypt('x')]);
        $evento = OutboxEvent::create(['event_type' => 'PasswordResetRequested', 'event_version' => 1, 'payload' => ['user_id' => $user->id, 'token' => PasswordResetTratador::TOKEN_ENVIADO], 'status' => 'pending', 'available_at' => now()]);

        $mensagens = app(PasswordResetTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }

    public function test_usuario_removido_depois_do_publish_nao_gera_mensagem(): void
    {
        $evento = OutboxEvent::create(['event_type' => 'PasswordResetRequested', 'event_version' => 1, 'payload' => ['user_id' => 999999, 'token' => 'x'], 'status' => 'pending', 'available_at' => now()]);

        $mensagens = app(PasswordResetTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }
}

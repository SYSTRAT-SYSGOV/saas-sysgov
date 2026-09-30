<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\EmailVerificationToken;
use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Notificacoes\Tratadores\CadastroExternoCriadoTratador;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 5.1 — tratador de `cursos.CadastroExternoCriado` (design D5): gera o token de
 * verificação na hora do envio, não no publish, pra nunca ficar em claro no Outbox.
 */
final class CadastroExternoCriadoTratadorTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
    }

    private function cadastrar(string $email = 'ana@fora.gov.br'): void
    {
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/cadastro", [
            'nome' => 'Ana Externa', 'email' => $email, 'senha' => 'Senha@123', 'senha_confirmation' => 'Senha@123',
            'documento' => null, 'aceite' => true,
        ])->assertOk();
    }

    public function test_cenario_link_de_verificacao_e_enviado_com_token_de_uso_unico(): void
    {
        $this->cadastrar();
        $user = User::where('email', 'ana@fora.gov.br')->sole();

        $this->assertSame(0, EmailVerificationToken::count());

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::sole();
        $this->assertSame('enviado', $envio->situacao);
        $this->assertSame('ana@fora.gov.br', $envio->destinatario);
        $this->assertSame(CadastroExternoCriadoTratador::TIPO, $envio->tipo);

        $token = EmailVerificationToken::sole();
        $this->assertSame($user->id, $token->user_id);
        $this->assertSame($this->tenant->id, $token->tenant_id);
        $this->assertNull($token->used_at);
        $this->assertTrue($token->expires_at->isFuture());
    }

    public function test_link_usa_o_portal_url_e_a_identidade_do_orgao(): void
    {
        config(['app.portal_url' => 'https://portal.exemplo.gov.br']);
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true], 'portalTitle' => 'Portal da Prefeitura A']]);
        $this->cadastrar();
        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();

        $mensagens = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertCount(1, $mensagens);
        $html = $mensagens[0]->mailable->render();
        $this->assertStringContainsString('Portal da Prefeitura A', $html);
        $this->assertMatchesRegularExpression(
            '#https://portal\.exemplo\.gov\.br/verificar-email\?token=[A-Za-z0-9]{64}#',
            $html,
        );
    }

    public function test_cenario_nova_tentativa_depois_do_envio_nao_gera_novo_token(): void
    {
        $this->cadastrar();
        $this->artisan('outbox:process')->assertSuccessful();
        $this->assertSame(1, EmailVerificationToken::count());

        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();
        $mensagens = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
        $this->assertSame(1, EmailVerificationToken::count());
    }

    public function test_tentativa_que_ainda_nao_enviou_pode_gerar_outro_token(): void
    {
        $this->cadastrar();
        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();

        $primeira = app(CadastroExternoCriadoTratador::class)->tratar($evento);
        $segunda = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertCount(1, $primeira);
        $this->assertCount(1, $segunda);
        $this->assertSame(2, EmailVerificationToken::count());
    }

    public function test_vinculo_ja_verificado_nao_gera_mensagem(): void
    {
        $this->cadastrar();
        $user = User::where('email', 'ana@fora.gov.br')->sole();
        DB::table('tenant_user')->where('user_id', $user->id)->where('tenant_id', $this->tenant->id)->update(['status' => 'active']);
        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();

        $mensagens = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
        $this->assertSame(0, EmailVerificationToken::count());
    }

    public function test_usuario_removido_nao_gera_mensagem(): void
    {
        $evento = OutboxEvent::create([
            'event_type' => 'cursos.CadastroExternoCriado', 'event_version' => 1,
            'payload' => ['user_id' => 999999], 'status' => 'pending', 'available_at' => now(),
            'tenant_id' => $this->tenant->id,
        ]);

        $mensagens = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }

    public function test_evento_sem_tenant_nao_gera_mensagem(): void
    {
        $user = User::create(['name' => 'Órfã', 'email' => 'orfa@fora.gov.br', 'password' => bcrypt('x')]);
        $evento = OutboxEvent::create([
            'event_type' => 'cursos.CadastroExternoCriado', 'event_version' => 1,
            'payload' => ['user_id' => $user->id], 'status' => 'pending', 'available_at' => now(),
        ]);

        $mensagens = app(CadastroExternoCriadoTratador::class)->tratar($evento);

        $this->assertSame([], $mensagens);
    }
}

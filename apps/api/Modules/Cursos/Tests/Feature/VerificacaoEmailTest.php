<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\EmailVerificationToken;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Providers\CursosServiceProvider;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 2.6 — verificação de e-mail do cadastro externo (design D5/D6): token de uso único e
 * validade de 24h, ativação do vínculo pending, pedido de novo link, e login antes de verificar.
 */
final class VerificacaoEmailTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $externo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
        $this->externo = $this->usuarioPendente();
    }

    private function usuarioPendente(): User
    {
        $user = User::create(['name' => 'Externa', 'email' => 'externa@fora.gov.br', 'password' => bcrypt('Senha@123'), 'is_active' => true]);
        $role = DB::table('roles')->where('slug', 'participante_externo_cursos')->where('tenant_id', $this->tenant->id)->first();
        DB::table('tenant_user')->insert(['tenant_id' => $this->tenant->id, 'user_id' => $user->id, 'role_id' => $role->id, 'status' => 'pending', 'is_primary' => true]);

        return $user;
    }

    private function token(User $user, Tenant $tenant, string $tokenClaro = 'token-de-teste-123', ?\DateTimeInterface $expiraEm = null): EmailVerificationToken
    {
        return EmailVerificationToken::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'token_hash' => hash('sha256', $tokenClaro),
            'expires_at' => $expiraEm ?? now()->addHours(24),
        ]);
    }

    public function test_token_valido_ativa_o_vinculo(): void
    {
        $this->token($this->externo, $this->tenant);

        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'token-de-teste-123'])
            ->assertOk()->assertJsonStructure(['mensagem']);

        $vinculo = DB::table('tenant_user')->where('user_id', $this->externo->id)->where('tenant_id', $this->tenant->id)->first();
        $this->assertSame('active', $vinculo->status);
    }

    public function test_token_inexistente_e_rejeitado(): void
    {
        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'nao-existe'])
            ->assertStatus(422)->assertJsonValidationErrors('token');
    }

    public function test_token_vencido_e_rejeitado_e_vinculo_continua_pending(): void
    {
        $this->token($this->externo, $this->tenant, expiraEm: now()->subMinute());

        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'token-de-teste-123'])
            ->assertStatus(422)->assertJsonValidationErrors('token');

        $vinculo = DB::table('tenant_user')->where('user_id', $this->externo->id)->where('tenant_id', $this->tenant->id)->first();
        $this->assertSame('pending', $vinculo->status);
    }

    public function test_token_usado_duas_vezes_e_rejeitado_na_segunda(): void
    {
        $this->token($this->externo, $this->tenant);

        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'token-de-teste-123'])->assertOk();
        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'token-de-teste-123'])
            ->assertStatus(422)->assertJsonValidationErrors('token');
    }

    public function test_login_antes_da_verificacao_orienta_conferir_o_email(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'externa@fora.gov.br', 'password' => 'Senha@123', 'tenant_slug' => $this->tenant->slug])
            ->assertStatus(422)
            ->assertJsonPath('errors.tenant_slug.0', 'Verifique seu e-mail para ativar o cadastro antes de entrar.');
    }

    public function test_login_apos_verificacao_funciona(): void
    {
        $this->token($this->externo, $this->tenant);
        $this->postJson('/api/public/cursos/verificar-email', ['token' => 'token-de-teste-123'])->assertOk();

        $this->postJson('/api/auth/login', ['email' => 'externa@fora.gov.br', 'password' => 'Senha@123', 'tenant_slug' => $this->tenant->slug])
            ->assertOk();
    }

    public function test_pedido_de_novo_link_publica_evento_quando_pendente(): void
    {
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/pedir-novo-link", ['email' => 'externa@fora.gov.br'])
            ->assertOk()->assertJsonStructure(['mensagem']);

        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->where('tenant_id', $this->tenant->id)->exists());
    }

    public function test_pedido_de_novo_link_com_email_desconhecido_responde_igual_sem_publicar_nada(): void
    {
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/pedir-novo-link", ['email' => 'nao-existe@fora.gov.br'])
            ->assertOk()->assertJsonStructure(['mensagem']);

        $this->assertSame(0, OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->count());
    }

    /**
     * Achado da revisão do PR (tarefa 7.4): antes desta mudança, só o limite genérico de
     * `cursos-publico` (30/min por IP, compartilhado por toda rota pública) valia aqui — o
     * suficiente pra inundar a caixa de entrada de um e-mail alheio bem mais rápido que o limite
     * de cadastro novo (5/hora). `cursos-pedir-novo-link-ip` fecha essa lacuna.
     */
    public function test_cenario_excesso_de_pedidos_de_novo_link_do_mesmo_ip(): void
    {
        $limite = CursosServiceProvider::LIMITE_PEDIR_NOVO_LINK_IP_POR_HORA;

        for ($i = 1; $i <= $limite; $i++) {
            $this->postJson("/api/public/cursos/{$this->tenant->slug}/pedir-novo-link", ['email' => 'externa@fora.gov.br'])->assertOk();
        }

        $this->postJson("/api/public/cursos/{$this->tenant->slug}/pedir-novo-link", ['email' => 'externa@fora.gov.br'])->assertStatus(429);

        $this->travel(3601)->seconds();
        $this->postJson("/api/public/cursos/{$this->tenant->slug}/pedir-novo-link", ['email' => 'externa@fora.gov.br'])->assertOk();
    }
}

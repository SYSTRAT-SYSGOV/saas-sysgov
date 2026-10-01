<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Providers\CursosServiceProvider;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 2.4 — CadastroExternoService (design D6/D10): os três caminhos do e-mail no cadastro
 * público, resposta sempre igual, senha descartada no caminho de outro órgão, aceite obrigatório.
 */
final class CadastroExternoTest extends TestCase
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

    /**
     * @param array<string, mixed> $sobrescrever
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function cadastrar(array $sobrescrever = [])
    {
        return $this->postJson("/api/public/cursos/{$this->tenant->slug}/cadastro", [
            'nome' => 'Ana Externa',
            'email' => 'ana.externa@fora.gov.br',
            'senha' => 'Senha@123',
            'senha_confirmation' => 'Senha@123',
            'documento' => null,
            'aceite' => true,
            ...$sobrescrever,
        ]);
    }

    private function vinculoPivot(User $user, Tenant $tenant): ?object
    {
        return DB::table('tenant_user')->where('user_id', $user->id)->where('tenant_id', $tenant->id)->first();
    }

    public function test_cadastro_cria_usuario_vinculo_pending_e_participante(): void
    {
        $this->cadastrar()->assertOk()->assertJsonStructure(['mensagem']);

        $user = User::where('email', 'ana.externa@fora.gov.br')->sole();
        $this->assertTrue(Hash::check('Senha@123', $user->password));

        $vinculo = $this->vinculoPivot($user, $this->tenant);
        $this->assertNotNull($vinculo);
        $this->assertSame('pending', $vinculo->status);

        $temPapelExterno = $user->roles()->where('slug', 'participante_externo_cursos')->exists();
        $this->assertTrue($temPapelExterno);

        $participante = $this->noTenant($this->tenant, fn () => Participante::where('user_id', $user->id)->sole());
        $this->assertSame(Participante::ORIGEM_EXTERNO, $participante->origem);
        $this->assertNotNull($participante->consentimento_em);

        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();
        $this->assertSame($this->tenant->id, $evento->tenant_id);
        $this->assertSame($user->id, $evento->payload['user_id']);
    }

    public function test_email_ja_vinculado_a_este_orgao_nao_altera_nada_so_orienta_recuperar_senha(): void
    {
        $existente = $this->usuario($this->tenant, ['participante_cursos'], 'Já Cadastrada');
        $senhaOriginal = $existente->password;

        $this->cadastrar(['email' => $existente->email])->assertOk()->assertJsonStructure(['mensagem']);

        $this->assertSame($senhaOriginal, $existente->fresh()->password);
        $this->assertSame(0, OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->count());
        // requestPasswordReset publica PasswordResetRequested (já testado em Section 1) — só
        // confirma que este caminho reaproveita esse fluxo em vez de criar um vínculo novo.
        $this->assertTrue(OutboxEvent::where('event_type', 'PasswordResetRequested')->exists());
    }

    public function test_email_com_conta_em_outro_orgao_ganha_vinculo_novo_e_descarta_a_senha_do_formulario(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $usuarioDeOutroOrgao = $this->usuario($outroTenant, ['participante_cursos'], 'De Outro Órgão');
        $senhaOriginal = $usuarioDeOutroOrgao->password;

        $this->cadastrar(['email' => $usuarioDeOutroOrgao->email])->assertOk();

        $this->assertSame($senhaOriginal, $usuarioDeOutroOrgao->fresh()->password);
        $vinculo = $this->vinculoPivot($usuarioDeOutroOrgao, $this->tenant);
        $this->assertNotNull($vinculo);
        $this->assertSame('pending', $vinculo->status);

        $evento = OutboxEvent::where('event_type', 'cursos.CadastroExternoCriado')->sole();
        $this->assertSame($usuarioDeOutroOrgao->id, $evento->payload['user_id']);
    }

    public function test_cadastro_sem_aceite_do_termo_e_rejeitado(): void
    {
        $this->cadastrar(['aceite' => false])->assertStatus(422)->assertJsonValidationErrors('aceite');

        $this->assertSame(0, User::where('email', 'ana.externa@fora.gov.br')->count());
    }

    public function test_cpf_invalido_e_rejeitado(): void
    {
        $this->cadastrar(['documento' => '111.111.111-11'])->assertStatus(422);

        $this->assertSame(0, User::where('email', 'ana.externa@fora.gov.br')->count());
    }

    public function test_cpf_valido_e_aceito(): void
    {
        $this->cadastrar(['documento' => '529.982.247-25'])->assertOk();

        $user = User::where('email', 'ana.externa@fora.gov.br')->sole();
        $participante = $this->noTenant($this->tenant, fn () => Participante::where('user_id', $user->id)->sole());
        $this->assertSame('529.982.247-25', $participante->documento);
    }

    public function test_cpf_obrigatorio_pela_configuracao_do_orgao_recusa_cadastro_sem_documento(): void
    {
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true, 'documento_obrigatorio' => true]]]);

        $this->cadastrar(['documento' => null])->assertJsonValidationErrors('documento');

        $this->assertSame(0, User::where('email', 'ana.externa@fora.gov.br')->count());
    }

    public function test_cpf_obrigatorio_pela_configuracao_do_orgao_aceita_cadastro_com_documento(): void
    {
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true, 'documento_obrigatorio' => true]]]);

        $this->cadastrar(['documento' => '529.982.247-25'])->assertOk();

        $this->assertSame(1, User::where('email', 'ana.externa@fora.gov.br')->count());
    }

    public function test_cenario_excesso_de_cadastros_do_mesmo_ip(): void
    {
        $limite = CursosServiceProvider::LIMITE_CADASTRO_IP_POR_HORA;

        for ($i = 1; $i <= $limite; $i++) {
            $this->cadastrar(['email' => "externo{$i}@fora.gov.br"])->assertOk();
        }

        $this->cadastrar(['email' => 'externo-extra@fora.gov.br'])->assertStatus(429);

        $this->travel(3601)->seconds();
        $this->cadastrar(['email' => 'externo-extra@fora.gov.br'])->assertOk();
    }

    public function test_cenario_excesso_de_cadastros_do_mesmo_email(): void
    {
        $limite = CursosServiceProvider::LIMITE_CADASTRO_EMAIL_POR_HORA;
        $email = 'alvo@fora.gov.br';

        for ($i = 1; $i <= $limite; $i++) {
            $this->cadastrar(['email' => $email])->assertOk();
        }

        $antes = OutboxEvent::count();

        // Resposta continua sendo a de sucesso (D8: nunca revela nada) — só não dispara mais
        // e-mail nenhum pra esse endereço até passar a hora.
        $this->cadastrar(['email' => $email])->assertOk();

        $this->assertSame($antes, OutboxEvent::count());
    }

    public function test_cenario_campo_isca_preenchido(): void
    {
        $this->cadastrar(['website' => 'http://bot.example', 'email' => 'bot@fora.gov.br'])
            ->assertOk()
            ->assertJsonStructure(['mensagem']);

        $this->assertSame(0, User::where('email', 'bot@fora.gov.br')->count());
        $this->assertSame(0, OutboxEvent::count());
    }
}

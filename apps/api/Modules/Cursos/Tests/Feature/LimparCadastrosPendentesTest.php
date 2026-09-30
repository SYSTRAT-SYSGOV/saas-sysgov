<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Console\Commands\LimparCadastrosPendentesCommand;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 2.8 — comando agendado de limpeza (design D6): vínculo `tenant_user` pending do cadastro
 * externo que passou de 7 dias sem verificação, e o `User` junto se esse era o único vínculo dele.
 */
final class LimparCadastrosPendentesTest extends TestCase
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

    private function cadastrarExterno(Tenant $tenant, string $email): void
    {
        $this->postJson("/api/public/cursos/{$tenant->slug}/cadastro", [
            'nome' => 'Ana Externa',
            'email' => $email,
            'senha' => 'Senha@123',
            'senha_confirmation' => 'Senha@123',
            'documento' => null,
            'aceite' => true,
        ])->assertOk();
    }

    private function vinculoPendente(User $user, Tenant $tenant): bool
    {
        return DB::table('tenant_user')->where('user_id', $user->id)->where('tenant_id', $tenant->id)->where('status', 'pending')->exists();
    }

    public function test_vinculo_pending_com_mais_de_7_dias_e_removido_com_o_usuario(): void
    {
        $this->cadastrarExterno($this->tenant, 'antiga@fora.gov.br');
        $user = User::where('email', 'antiga@fora.gov.br')->sole();

        $this->travel(LimparCadastrosPendentesCommand::DIAS_LIMITE + 1)->days();
        $this->artisan('cursos:limpar-cadastros-pendentes')->assertSuccessful();

        $this->assertFalse($this->vinculoPendente($user, $this->tenant));
        $this->assertSame(0, User::where('id', $user->id)->count());
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Participante::where('user_id', $user->id)->count()));
    }

    public function test_vinculo_pending_recente_nao_e_removido(): void
    {
        $this->cadastrarExterno($this->tenant, 'recente@fora.gov.br');
        $user = User::where('email', 'recente@fora.gov.br')->sole();

        $this->travel(LimparCadastrosPendentesCommand::DIAS_LIMITE - 1)->days();
        $this->artisan('cursos:limpar-cadastros-pendentes')->assertSuccessful();

        $this->assertTrue($this->vinculoPendente($user, $this->tenant));
        $this->assertSame(1, User::where('id', $user->id)->count());
    }

    public function test_usuario_com_vinculo_em_outro_orgao_so_perde_o_vinculo_pending_vencido(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $this->cadastrarExterno($this->tenant, 'dupla@fora.gov.br');
        $user = User::where('email', 'dupla@fora.gov.br')->sole();
        $user->tenants()->attach($outroTenant->id, ['status' => 'active', 'is_primary' => false]);

        $this->travel(LimparCadastrosPendentesCommand::DIAS_LIMITE + 1)->days();
        $this->artisan('cursos:limpar-cadastros-pendentes')->assertSuccessful();

        $this->assertFalse($this->vinculoPendente($user, $this->tenant));
        $this->assertSame(1, User::where('id', $user->id)->count());
        $this->assertTrue(DB::table('tenant_user')->where('user_id', $user->id)->where('tenant_id', $outroTenant->id)->exists());
    }

    public function test_token_de_verificacao_do_orgao_e_removido_junto(): void
    {
        $this->cadastrarExterno($this->tenant, 'com-token@fora.gov.br');
        $user = User::where('email', 'com-token@fora.gov.br')->sole();
        DB::table('email_verification_tokens')->insert([
            'user_id' => $user->id,
            'tenant_id' => $this->tenant->id,
            'token_hash' => hash('sha256', 'token-de-teste'),
            'expires_at' => now()->addDay(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->travel(LimparCadastrosPendentesCommand::DIAS_LIMITE + 1)->days();
        $this->artisan('cursos:limpar-cadastros-pendentes')->assertSuccessful();

        $this->assertSame(0, DB::table('email_verification_tokens')->where('user_id', $user->id)->count());
    }
}

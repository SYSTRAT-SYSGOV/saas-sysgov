<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\User;
use App\Services\Ai\NanoGptClient;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\AiSettings;
use Modules\Admin\Tests\TestCase;

/**
 * Configuração ÚNICA de IA da plataforma (Modules\Admin\Models\AiSettings)
 * — ver Modules\Admin\Http\Controllers\AiSettingsController. Compartilhada
 * por todos os tenants, gerenciável só por is_platform_admin.
 */
final class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    private function admin(): User
    {
        return User::where('is_platform_admin', true)->firstOrFail();
    }

    private function suporte(): User
    {
        // Acesso ao painel via role de escopo 'systrat' (passa por
        // EnsurePlatformAdmin), mas sem is_platform_admin — não pode
        // gerenciar a config de IA (só quem é is_platform_admin pode).
        $user = User::create(['name' => 'Suporte', 'email' => 'suporte@systrat.com.br', 'password' => bcrypt('secret')]);
        $role = \App\Models\Role::where('scope', 'systrat')->where('slug', 'suporte')->first()
            ?? \App\Models\Role::where('scope', 'systrat')->firstOrFail();
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_show_retorna_valores_padrao_na_primeira_leitura(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/ai-settings')
            ->assertOk()
            ->assertJson([
                'enabled' => false,
                'provider' => 'nanogpt',
                'model' => 'deepseek/deepseek-v4-pro-0813',
                'apiKeyConfigured' => false,
                'apiKeyMasked' => null,
            ]);
    }

    public function test_admin_atualiza_configuracao_e_a_chave_fica_mascarada_na_resposta(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/ai-settings', [
                'enabled' => true,
                'provider' => 'nanogpt',
                'base_url' => 'https://nano-gpt.com/api/v1',
                'model' => 'deepseek/deepseek-v4-pro-0813',
                'max_tokens' => 4096,
                'api_key' => 'sk-abc123XYZ9999',
            ])
            ->assertOk()
            ->assertJson(['enabled' => true, 'apiKeyConfigured' => true, 'apiKeyMasked' => '••••9999']);

        // A chave nunca é exposta em texto puro, nem lendo de novo.
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/ai-settings')
            ->assertOk()
            ->assertJsonMissing(['api_key' => 'sk-abc123XYZ9999']);

        self::assertSame('sk-abc123XYZ9999', AiSettings::current()->api_key);
    }

    public function test_atualizar_sem_enviar_api_key_mantem_a_chave_ja_salva(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/ai-settings', [
            'enabled' => true, 'provider' => 'nanogpt', 'base_url' => 'https://nano-gpt.com/api/v1',
            'model' => 'deepseek/deepseek-v4-pro-0813', 'max_tokens' => 2048, 'api_key' => 'chave-original',
        ])->assertOk();

        // Reenvia o form sem o campo api_key (como o front faz quando o
        // admin só mexeu no max_tokens, sem tocar no campo de chave).
        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/ai-settings', [
            'enabled' => true, 'provider' => 'nanogpt', 'base_url' => 'https://nano-gpt.com/api/v1',
            'model' => 'deepseek/deepseek-v4-pro-0813', 'max_tokens' => 8192,
        ])->assertOk()->assertJson(['maxTokens' => 8192, 'apiKeyConfigured' => true]);

        self::assertSame('chave-original', AiSettings::current()->api_key);
    }

    public function test_usuario_systrat_sem_ser_platform_admin_nao_pode_atualizar(): void
    {
        $this->actingAs($this->suporte(), 'sanctum')
            ->putJson('/api/admin/ai-settings', [
                'enabled' => true, 'provider' => 'nanogpt', 'base_url' => 'https://nano-gpt.com/api/v1',
                'model' => 'deepseek/deepseek-v4-pro-0813', 'max_tokens' => 2048,
            ])
            ->assertForbidden();
    }

    public function test_teste_de_conexao_sem_chave_nenhuma_retorna_erro_sem_chamar_a_rede(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/ai-settings/test', [])
            ->assertStatus(422)
            ->assertJson(['ok' => false]);
    }

    public function test_teste_de_conexao_bem_sucedido_usa_os_valores_do_formulario(): void
    {
        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages, array $options, ?AiSettings $settings) {
                    return $settings !== null
                        && $settings->api_key === 'chave-do-formulario'
                        && $settings->model === 'deepseek/deepseek-v4-pro-0813';
                })
                ->andReturn(['content' => 'ok', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/ai-settings/test', [
                'api_key' => 'chave-do-formulario',
                'model' => 'deepseek/deepseek-v4-pro-0813',
            ])
            ->assertOk()
            ->assertJson(['ok' => true, 'model' => 'deepseek/deepseek-v4-pro-0813']);
    }
}

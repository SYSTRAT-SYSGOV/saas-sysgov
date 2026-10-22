<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\ServidorPessoaService;
use Modules\Capd\Services\ServidorService;
use Modules\Capd\Tests\Support\ServidorDeTeste;
use Modules\Pessoas\Models\PessoaUsuario;
use Tests\TestCase;

/** Fase 5, task 2.3: e-mail e telefone do servidor vivem como contatos da pessoa; o usuário se liga pela pessoa, não pelo e-mail da coluna. */
final class ServidorContatosEUsuarioTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function usuario(string $email): User
    {
        $user = User::create(['name' => 'Servidor', 'email' => $email, 'password' => bcrypt('secret')]);
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        return $user;
    }

    /** @return array<string, mixed> */
    private function dados(string $matricula = 'M-1', string $cpf = '52998224725'): array
    {
        return ['matricula' => $matricula, 'cpf' => $cpf, 'nome_completo' => 'João Pereira', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', 'regime_juridico' => 'estatutario'];
    }

    public function test_cadastro_grava_email_e_telefone_como_contatos_principais_da_pessoa(): void
    {
        $servidor = app(ServidorService::class)->create([...$this->dados(), 'email' => 'Joao@Araucaria.pr.gov.br', 'telefone' => '(41) 3000-0000']);

        $contatos = $servidor->pessoa->contatos->mapWithKeys(fn ($c) => [$c->tipo => [$c->valor, $c->principal]])->all();
        $this->assertSame(['joao@araucaria.pr.gov.br', true], $contatos['email']);
        $this->assertSame(['(41) 3000-0000', true], $contatos['telefone']);
        $this->assertSame('joao@araucaria.pr.gov.br', $servidor->emailDaPessoa());
        $this->assertSame('(41) 3000-0000', $servidor->telefoneDaPessoa());
        $this->assertArrayNotHasKey('email', $servidor->getAttributes());
    }

    public function test_edicao_troca_o_contato_principal_e_vazio_nao_apaga(): void
    {
        $service = app(ServidorService::class);
        $servidor = $service->create([...$this->dados(), 'email' => 'antigo@araucaria.pr.gov.br']);

        $servidor = $service->update($servidor, ['email' => 'novo@araucaria.pr.gov.br']);
        $this->assertSame('novo@araucaria.pr.gov.br', $servidor->emailDaPessoa());
        $this->assertSame(1, $servidor->pessoa->contatos()->where('tipo', 'email')->count());

        $servidor = $service->update($servidor, ['email' => '', 'telefone' => null]);
        $this->assertSame('novo@araucaria.pr.gov.br', $servidor->fresh()->emailDaPessoa());
    }

    public function test_telefone_cai_no_celular_da_pessoa_quando_nao_ha_fixo(): void
    {
        $servidor = ServidorDeTeste::criar([...$this->dados(), 'nome_completo' => 'Maria']);
        $servidor->pessoa->contatos()->create(['tipo' => 'celular', 'valor' => '(41) 99999-0000', 'principal' => true]);

        $this->assertSame('(41) 99999-0000', $servidor->fresh()->telefoneDaPessoa());
    }

    public function test_json_traz_email_e_telefone_da_pessoa(): void
    {
        $servidor = ServidorDeTeste::criar([...$this->dados(), 'email' => 'a@araucaria.pr.gov.br', 'telefone' => '3000']);
        $gestor = $this->usuario('gestor@araucaria.pr.gov.br');

        $this->actingAs($gestor)->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson("/api/capd/servidores/{$servidor->id}")
            ->assertOk()->assertJsonPath('email', 'a@araucaria.pr.gov.br')->assertJsonPath('telefone', '3000');
    }

    public function test_meu_perfil_acha_o_servidor_pelo_email_da_pessoa_e_liga_o_usuario(): void
    {
        $servidor = ServidorDeTeste::criar([...$this->dados(), 'email' => 'joao@araucaria.pr.gov.br']);
        $user = $this->usuario('Joao@araucaria.pr.gov.br');

        $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson('/api/capd/servidores/meu-perfil')
            ->assertOk()->assertJsonPath('servidor.id', $servidor->id)->assertJsonPath('servidor.email', 'joao@araucaria.pr.gov.br');

        $this->assertSame($user->id, $servidor->fresh()->user_id);
        $this->assertSame($servidor->pessoa_id, PessoaUsuario::query()->where('user_id', $user->id)->value('pessoa_id'));
    }

    public function test_meu_perfil_acha_pelo_vinculo_da_pessoa_mesmo_com_email_diferente(): void
    {
        $servidor = ServidorDeTeste::criar($this->dados());
        $user = $this->usuario('outro@exemplo.com');
        PessoaUsuario::query()->forceCreate(['tenant_id' => $this->tenant->id, 'pessoa_id' => $servidor->pessoa_id, 'user_id' => $user->id, 'promovido_em' => now()]);

        $this->actingAs($user)->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson('/api/capd/servidores/meu-perfil')
            ->assertOk()->assertJsonPath('servidor.id', $servidor->id);
        $this->assertSame($user->id, $servidor->fresh()->user_id);
    }

    public function test_nao_toma_servidor_ja_ligado_a_outro_usuario(): void
    {
        $dono = $this->usuario('dono@araucaria.pr.gov.br');
        $servidor = ServidorDeTeste::criar([...$this->dados(), 'email' => 'joao@araucaria.pr.gov.br', 'user_id' => $dono->id]);
        $intruso = $this->usuario('joao@araucaria.pr.gov.br');

        $this->assertNull(app(ServidorPessoaService::class)->servidorDoUsuario($intruso));
        $this->assertSame($dono->id, $servidor->fresh()->user_id);
    }

    public function test_vincular_usuario_nao_duplica_vinculo_da_pessoa(): void
    {
        $servidor = ServidorDeTeste::criar($this->dados());
        $user = $this->usuario('joao@araucaria.pr.gov.br');
        $service = app(ServidorPessoaService::class);

        $service->vincularUsuario($servidor, $user);
        $service->vincularUsuario($servidor->fresh(), $user);

        $this->assertSame(1, PessoaUsuario::query()->where('pessoa_id', $servidor->pessoa_id)->count());
        $this->assertSame(1, Servidor::query()->where('user_id', $user->id)->count());
    }
}

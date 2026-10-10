<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Modules\Inservivel\Services\ConfiguracaoService;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento as DocumentoPessoa;

/** spec: inservivel › Cadastro público da entidade (D6, D7). */
final class CadastroPublicoTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        RateLimiter::clear('POST|127.0.0.1');
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function formulario(Tenant $tenant, array $extra = [], ?string $semDocumento = null): array
    {
        $documentos = [];
        foreach ($this->noTenant($tenant, fn () => app(ConfiguracaoService::class)->documentosExigidos()) as $doc) {
            if ($doc['chave'] !== $semDocumento) {
                $documentos[$doc['chave']] = UploadedFile::fake()->create($doc['chave'] . '.pdf', 50, 'application/pdf');
            }
        }

        return [
            'razao_social' => 'Associação Esperança', 'nome_fantasia' => 'Esperança', 'cnpj' => '11.222.333/0001-81', 'endereco' => 'Rua das Flores, 100',
            'cep' => '83702-000', 'cidade' => 'Araucária', 'uf' => 'PR', 'celular' => '(41) 99999-0000', 'email' => 'contato@esperanca.org',
            'representante_legal' => 'Ana Souza', 'cpf_representante' => '529.982.247-25', 'cargo_representante' => 'Presidente',
            'tempo_funcionamento_anos' => 8, 'area_atuacao' => 'Educação', 'finalidade' => 'Reforço escolar', 'numero_beneficiarios' => 120,
            'senha' => 'senhaForte123', 'senha_confirmation' => 'senhaForte123', 'aceite_privacidade' => '1',
            'documentos' => $documentos, 'validades' => ['certidoes_negativas' => '2027-06-30'],
            ...$extra,
        ];
    }

    public function test_cadastro_valido_cria_conta_que_entra_no_portal(): void
    {
        $tenant = $this->criarTenant();
        $this->post('/api/public/inservivel/prefeitura-a/entidades', $this->formulario($tenant))->assertCreated();

        $this->assertDatabaseHas('inservivel_entidades', ['tenant_id' => $tenant->id, 'cnpj' => '11222333000181', 'status' => 'pendente']);
        self::assertSame(6, $this->noTenant($tenant, fn () => \Modules\Inservivel\Models\EntidadeDocumento::query()->count()));
        $this->assertDatabaseHas('inservivel_entidade_documentos', ['tipo' => 'certidoes_negativas', 'validade' => '2027-06-30']);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.EntidadeCadastrada']);
        $pessoa = $this->noTenant($tenant, fn () => Pessoa::query()->where('cpf_hash', DocumentoPessoa::hash('52998224725'))->first());
        self::assertNotNull($pessoa);

        $conta = User::query()->where('email', 'contato@esperanca.org')->firstOrFail();
        self::assertTrue($conta->hasPermission('inservivel.portal', $tenant->id));
        self::assertSame($conta->id, $pessoa->usuario?->user_id);
        $this->como($conta, $tenant)->getJson('/api/inservivel/portal/me')->assertOk()->assertJsonPath('status', 'pendente');
        $this->como($conta, $tenant)->getJson('/api/inservivel/bens')->assertForbidden();
    }

    public function test_documento_obrigatorio_faltando_nao_cria_nada(): void
    {
        $tenant = $this->criarTenant();
        $this->post('/api/public/inservivel/prefeitura-a/entidades', $this->formulario($tenant, semDocumento: 'cartao_cnpj'))->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'contato@esperanca.org']);
        $this->assertDatabaseCount('inservivel_entidades', 0);
    }

    public function test_campo_isca_descarta_em_silencio(): void
    {
        $tenant = $this->criarTenant();
        $this->post('/api/public/inservivel/prefeitura-a/entidades', $this->formulario($tenant, ['website' => 'http://spam']))->assertCreated();
        $this->assertDatabaseCount('inservivel_entidades', 0);
    }

    public function test_cnpj_ou_email_repetido_recebe_mensagem_generica(): void
    {
        $tenant = $this->criarTenant();
        $this->post('/api/public/inservivel/prefeitura-a/entidades', $this->formulario($tenant))->assertCreated();
        $this->post('/api/public/inservivel/prefeitura-a/entidades', $this->formulario($tenant, ['email' => 'outro@esperanca.org']))
            ->assertStatus(422)->assertJsonPath('error', 'Não foi possível concluir o cadastro: e-mail ou CNPJ já cadastrado. Se a entidade já tem conta, entre pelo login.');
    }

    public function test_slug_sem_o_modulo_responde_404(): void
    {
        $tenant = $this->criarTenant('sem-modulo', comModulo: false);
        $this->getJson('/api/public/inservivel/sem-modulo/formulario')->assertNotFound();
        $this->getJson('/api/public/inservivel/nao-existe/formulario')->assertNotFound();
        unset($tenant);
    }

    public function test_formulario_lista_documentos_exigidos(): void
    {
        $this->criarTenant();
        $this->getJson('/api/public/inservivel/prefeitura-a/formulario')->assertOk()->assertJsonCount(6, 'documentos_exigidos')
            ->assertJsonPath('orgao.nome', 'Prefeitura Prefeitura A');
    }

    public function test_limite_de_cadastros_por_ip(): void
    {
        $this->criarTenant();
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/public/inservivel/prefeitura-a/entidades', ['website' => 'x'])->assertCreated();
        }
        $this->postJson('/api/public/inservivel/prefeitura-a/entidades', ['website' => 'x'])->assertStatus(429);
    }

    public function test_controllers_publicos_so_dependem_do_servico_de_cadastro(): void
    {
        foreach (glob(__DIR__ . '/../../Http/Controllers/Publico/*.php') ?: [] as $arquivo) {
            $codigo = (string) file_get_contents($arquivo);
            self::assertDoesNotMatchRegularExpression('/use Modules\\\\Inservivel\\\\Models\\\\/', $codigo, basename($arquivo) . ' não pode consultar models do módulo diretamente.');
        }
    }
}

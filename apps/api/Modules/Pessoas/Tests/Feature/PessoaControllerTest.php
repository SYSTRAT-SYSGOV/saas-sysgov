<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaControllerTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_admin_cadastra_pessoa_via_api(): void
    {
        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas', ['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $resposta->assertCreated();
        self::assertSame(1, Pessoa::count());
    }

    public function test_edicao_sem_permissao_e_rejeitada(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $usuario = $this->usuario($this->tenant, ['cadastros.pessoas.view']);

        $this->como($usuario, $this->tenant)
            ->putJson("/api/pessoas/{$pessoa->id}", ['nome' => 'Nome Alterado'])
            ->assertForbidden();

        self::assertSame('Maria Titular', $pessoa->refresh()->nome);
    }

    public function test_adiciona_documento_endereco_e_contato_via_api(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $admin = $this->como($this->admin($this->tenant), $this->tenant);

        $admin->postJson("/api/pessoas/{$pessoa->id}/documentos", ['tipo' => 'rg', 'numero' => '1234567'])->assertCreated();
        $admin->postJson("/api/pessoas/{$pessoa->id}/enderecos", ['cep' => '80000-000', 'cidade' => 'Curitiba', 'uf' => 'PR'])->assertCreated();
        $admin->postJson("/api/pessoas/{$pessoa->id}/contatos", ['tipo' => 'email', 'valor' => 'maria@teste.gov.br', 'principal' => true])->assertCreated();

        self::assertSame(1, $pessoa->documentos()->count());
        self::assertSame(1, $pessoa->enderecos()->count());
        self::assertSame(1, $pessoa->contatos()->count());
    }

    public function test_lista_e_busca_pessoas(): void
    {
        Pessoa::create(['nome' => 'Ana', 'cpf' => $this->cpfValido()]);
        Pessoa::create(['nome' => 'Bruno', 'cpf' => $this->cpfValido()]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->getJson('/api/pessoas?q=Ana')
            ->assertOk()
            ->assertJsonPath('total', 1);
    }

    public function test_lista_compacta_retorna_apenas_campos_publicos_enxutos(): void
    {
        $pessoa = Pessoa::create([
            'nome' => 'Carlos Compacto',
            'nome_social' => 'Carlinhos',
            'cpf' => $this->cpfValido(),
            'data_nascimento' => '1990-05-15',
            'nome_mae' => 'Dona Maria',
        ]);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->getJson('/api/pessoas?compact=true&q=Carlos')
            ->assertOk();

        $dados = $resposta->json('data.0');
        self::assertSame($pessoa->id, $dados['id']);
        self::assertSame('Carlos Compacto', $dados['nome']);
        self::assertSame('Carlinhos', $dados['nome_social']);
        self::assertNotEmpty($dados['cpf_mascarado']);
        self::assertSame('ativo', $dados['status']);
        self::assertArrayNotHasKey('nome_mae', $dados);
        self::assertArrayNotHasKey('data_nascimento', $dados);
        self::assertArrayNotHasKey('vinculos', $dados);
    }
}


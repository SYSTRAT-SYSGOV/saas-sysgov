<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\AuditLog;
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

    public function test_usuario_comum_visualiza_apenas_cpf_mascarado(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Joao Sigiloso', 'cpf' => $cpf]);
        $usuario = $this->usuario($this->tenant, ['cadastros.pessoas.view']);

        $resposta = $this->como($usuario, $this->tenant)
            ->getJson("/api/pessoas/{$pessoa->id}")
            ->assertOk();

        $dados = $resposta->json();
        self::assertNotEmpty($dados['cpf_mascarado']);
        self::assertFalse($dados['pode_desmascarar']);
        self::assertArrayNotHasKey('cpf_desmascarado', $dados);
    }

    public function test_admin_tem_flag_pode_desmascarar_e_consegue_revelar_com_auditoria(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Joao Sigiloso', 'cpf' => $cpf]);
        $admin = $this->admin($this->tenant);

        // Sem reveal_sensitive: pode_desmascarar é true, mas não vem cpf_desmascarado ainda
        $resp1 = $this->como($admin, $this->tenant)
            ->getJson("/api/pessoas/{$pessoa->id}")
            ->assertOk();

        self::assertTrue($resp1->json('pode_desmascarar'));
        self::assertArrayNotHasKey('cpf_desmascarado', $resp1->json());

        // Com reveal_sensitive=true: retorna cpf_desmascarado e grava log de auditoria
        $resp2 = $this->como($admin, $this->tenant)
            ->getJson("/api/pessoas/{$pessoa->id}?reveal_sensitive=true")
            ->assertOk();

        self::assertTrue($resp2->json('pode_desmascarar'));
        self::assertSame($cpf, $resp2->json('cpf_desmascarado'));

        self::assertSame(1, AuditLog::where('action', 'pessoa.sensivel_visualizado')->count());
    }

    public function test_auditar_acesso_sensivel_via_endpoint(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Joao Sigiloso', 'cpf' => $cpf]);
        $admin = $this->admin($this->tenant);

        $resposta = $this->como($admin, $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/auditar-acesso-sensivel")
            ->assertOk();

        self::assertSame('success', $resposta->json('status'));
        self::assertSame($cpf, $resposta->json('cpf'));
        self::assertSame(1, AuditLog::where('action', 'pessoa.sensivel_visualizado')->count());
    }

    public function test_usuario_sem_permissao_tem_acesso_sensivel_rejeitado(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Joao Sigiloso', 'cpf' => $this->cpfValido()]);
        $usuario = $this->usuario($this->tenant, ['cadastros.pessoas.view']);

        $this->como($usuario, $this->tenant)
            ->getJson("/api/pessoas/{$pessoa->id}?reveal_sensitive=true")
            ->assertForbidden();

        $this->como($usuario, $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/auditar-acesso-sensivel")
            ->assertForbidden();

        self::assertSame(0, AuditLog::where('action', 'pessoa.sensivel_visualizado')->count());
    }

    public function test_atualizar_situacao_vital_e_obito_com_validacao_temporal(): void
    {
        $admin = $this->admin($this->tenant);
        $pessoa = Pessoa::create([
            'nome' => 'Cidadão Para Falecimento',
            'cpf' => $this->cpfValido(),
            'data_nascimento' => '1960-01-01',
            'status' => 'ativo',
        ]);

        // Rejeita data anterior ao nascimento
        $this->como($admin, $this->tenant)
            ->putJson("/api/pessoas/{$pessoa->id}", [
                'falecido' => true,
                'data_falecimento' => '1950-01-01',
            ])->assertUnprocessable();

        // Aceita data posterior ao nascimento
        $resposta = $this->como($admin, $this->tenant)
            ->putJson("/api/pessoas/{$pessoa->id}", [
                'falecido' => true,
                'data_falecimento' => '2026-02-15',
                'certidao_obito_numero' => '123456.01.55.2026.4.00001.001.0000001-01',
                'cartorio_obito' => '1º Registro Civil das Pessoas Naturais',
            ])->assertOk();

        self::assertTrue($resposta->json('falecido'));
        self::assertSame('2026-02-15', $resposta->json('data_falecimento'));
        self::assertSame('falecido', $resposta->json('status'));

        // Consulta compacta no picker também retorna dados de óbito
        $picker = $this->como($admin, $this->tenant)
            ->getJson("/api/pessoas?q=" . urlencode('Cidadão Para Falecimento') . "&compact=1")
            ->assertOk();

        self::assertTrue((bool) $picker->json('data.0.falecido'));
        self::assertSame('2026-02-15', $picker->json('data.0.data_falecimento'));
    }
}


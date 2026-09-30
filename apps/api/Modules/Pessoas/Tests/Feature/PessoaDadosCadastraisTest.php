<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaDadosCadastraisTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_pessoa_admite_multiplos_documentos(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $pessoa->documentos()->create(['tipo' => 'rg', 'numero' => '1234567']);
        $pessoa->documentos()->create(['tipo' => 'titulo_eleitor', 'numero' => '987654321']);

        self::assertSame(2, $pessoa->documentos()->count());
    }

    public function test_pessoa_admite_multiplos_enderecos_sem_sobrescrever_o_anterior(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $enderecoAntigo = $pessoa->enderecos()->create(['cep' => '80000-000', 'cidade' => 'Curitiba', 'uf' => 'PR']);
        $pessoa->enderecos()->create(['cep' => '81000-000', 'cidade' => 'Curitiba', 'uf' => 'PR']);

        self::assertSame(2, $pessoa->enderecos()->count());
        self::assertSame('80000-000', $enderecoAntigo->refresh()->cep);
    }

    public function test_marcar_novo_contato_principal_desmarca_o_anterior_do_mesmo_tipo(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $emailAntigo = $pessoa->contatos()->create(['tipo' => 'email', 'valor' => 'antigo@teste.gov.br', 'principal' => true]);
        $emailNovo = $pessoa->contatos()->create(['tipo' => 'email', 'valor' => 'novo@teste.gov.br', 'principal' => true]);

        self::assertFalse($emailAntigo->refresh()->principal);
        self::assertTrue($emailNovo->refresh()->principal);
    }

    public function test_vinculo_cadastrado_com_matricula_a_armazena_corretamente(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/vinculos", ['tipo_vinculo' => 'servidor_carreira', 'matricula' => 'MAT-00123']);

        $resposta->assertCreated();
        self::assertSame('MAT-00123', $pessoa->vinculos()->first()->matricula);
    }

    public function test_documento_cadastrado_com_uf_e_data_de_emissao_os_armazena(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/documentos", ['tipo' => 'rg', 'numero' => '1234567', 'uf_emissao' => 'PR', 'data_emissao' => '2020-01-15']);

        $resposta->assertCreated();
        $documento = $pessoa->documentos()->first();
        self::assertSame('PR', $documento->uf_emissao);
        self::assertSame('2020-01-15', $documento->data_emissao->toDateString());
    }

    public function test_contato_sem_autoriza_notificacoes_informado_assume_autorizado_por_padrao(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/contatos", ['tipo' => 'email', 'valor' => 'maria@teste.gov.br'])
            ->assertCreated();

        self::assertTrue($pessoa->contatos()->first()->autoriza_notificacoes);
    }
}

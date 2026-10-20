<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ImportacaoPessoaService;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Spec pessoas: "Proteção de dados de pessoa sem documento e de menores" e exibição do indicador de pendência. */
final class PessoaPendenteSerializacaoTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    private function pendenteMenor(): Pessoa
    {
        return Pessoa::create([
            'nome' => 'Aluno Pendente', 'data_nascimento' => now()->subYears(9)->toDateString(),
            'nome_mae' => 'Mãe Reservada', 'nome_pai' => 'Pai Reservado',
            'responsavel_id' => Pessoa::factory()->create()->id,
        ]);
    }

    public function test_seletor_compacto_devolve_nome_e_indicador_sem_dados_civis(): void
    {
        $this->pendenteMenor();

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->getJson('/api/pessoas?compact=1&q=Aluno')
            ->assertOk();

        $item = $resposta->json('data.0');
        $this->assertSame('Aluno Pendente', $item['nome']);
        $this->assertTrue($item['documento_pendente']);
        foreach (['data_nascimento', 'nome_mae', 'nome_pai', 'documento', 'documento_hash', 'cpf_desmascarado'] as $campo) {
            $this->assertArrayNotHasKey($campo, $item, "o seletor compacto não pode expor {$campo}");
        }
    }

    public function test_listagem_oculta_dados_civis_de_menor_sem_permissao_de_dados_sensiveis(): void
    {
        $this->pendenteMenor();

        $item = $this->como($this->usuario($this->tenant, []), $this->tenant)
            ->getJson('/api/pessoas?q=Aluno')
            ->assertOk()
            ->json('data.0');

        $this->assertNull($item['data_nascimento']);
        $this->assertNull($item['nome_mae']);
        $this->assertNull($item['nome_pai']);
        $this->assertTrue($item['documento_pendente']);
    }

    public function test_ficha_individual_continua_completa_para_edicao(): void
    {
        $menor = $this->pendenteMenor();

        $this->como($this->usuario($this->tenant, []), $this->tenant)
            ->getJson("/api/pessoas/{$menor->id}")
            ->assertOk()
            ->assertJsonPath('nome_mae', 'Mãe Reservada')
            ->assertJsonPath('documento_pendente', true);
    }

    public function test_listagem_pode_filtrar_pelas_pessoas_pendentes(): void
    {
        $this->pendenteMenor();
        Pessoa::factory()->create(['nome' => 'Aluno Com CPF']);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->getJson('/api/pessoas?documento_pendente=1')
            ->assertOk();

        $this->assertSame(1, $resposta->json('total'));
    }

    public function test_exportacao_inclui_o_indicador_e_nao_quebra_sem_documento(): void
    {
        $this->pendenteMenor();

        $json = $this->como($this->admin($this->tenant), $this->tenant)->getJson('/api/pessoas/export?format=json')->assertOk()->json();
        $registro = null;
        foreach ($json['pessoas'] ?? $json['data'] ?? [] as $candidata) {
            if (($candidata['nome'] ?? null) === 'Aluno Pendente') {
                $registro = $candidata;
            }
        }
        $this->assertNotNull($registro);
        $this->assertTrue($registro['documento_pendente']);
        $this->assertNull($registro['documento']);

        $csv = $this->como($this->admin($this->tenant), $this->tenant)->get('/api/pessoas/export?format=csv')->assertOk()->getContent();
        $this->assertStringContainsString('Documento_Pendente', $csv);
    }

    public function test_importacao_sem_documento_informa_motivo_claro(): void
    {
        $resultado = app(ImportacaoPessoaService::class)->importar(['nome' => 'Sem Documento']);

        $this->assertNull($resultado['pessoa']);
        $this->assertStringContainsString('ausente', (string) $resultado['erro']);
    }
}

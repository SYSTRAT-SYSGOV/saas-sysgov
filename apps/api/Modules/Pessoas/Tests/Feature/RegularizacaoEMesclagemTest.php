<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Regularização do documento e mesclagem de pessoas (spec pessoas: regularização e duplicidade). */
final class RegularizacaoEMesclagemTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('tenant-a');
        $this->noTenant($this->tenant);
    }

    /** @param array<string, mixed> $extra */
    private function pendente(array $extra = []): Pessoa
    {
        return Pessoa::create(['nome' => 'Sem CPF', 'data_nascimento' => '1990-01-01', ...$extra]);
    }

    public function test_regularizacao_com_cpf_novo_mantem_identificador_e_vinculos(): void
    {
        $pessoa = $this->pendente();
        $pessoa->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => today()->toDateString()]);
        $cpf = $this->cpfValido();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/regularizar-documento", ['cpf' => $cpf])
            ->assertOk()
            ->assertJsonPath('id', $pessoa->id)
            ->assertJsonPath('documento_pendente', false);

        $pessoa->refresh();
        self::assertFalse($pessoa->documento_pendente);
        self::assertSame($cpf, $pessoa->documento);
        self::assertSame(1, $pessoa->vinculos()->count());
    }

    public function test_regularizacao_e_auditada_sem_expor_o_cpf(): void
    {
        $pessoa = $this->pendente();
        $cpf = $this->cpfValido();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/regularizar-documento", ['cpf' => $cpf])
            ->assertOk();

        $registro = DB::table('audit_logs')->where('action', 'pessoa.documento_regularizado')->first();
        self::assertNotNull($registro);
        self::assertStringNotContainsString($cpf, json_encode($registro));
    }

    public function test_regularizacao_com_cpf_de_outra_pessoa_e_recusada_e_oferece_mesclagem(): void
    {
        $existente = Pessoa::factory()->create(['nome' => 'Já Cadastrada']);
        $pessoa = $this->pendente();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/regularizar-documento", ['cpf' => $existente->documento])
            ->assertStatus(422)
            ->assertJsonPath('code', 'documento_ja_cadastrado')
            ->assertJsonPath('pessoa_existente.id', $existente->id)
            ->assertJsonPath('mesclagem_disponivel', true);

        self::assertTrue($pessoa->fresh()->documento_pendente);
    }

    public function test_regularizacao_com_cpf_invalido_e_recusada(): void
    {
        $pessoa = $this->pendente();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/regularizar-documento", ['cpf' => '111.111.111-11'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'documento_invalido');
    }

    public function test_regularizar_pessoa_que_nao_esta_pendente_e_recusado(): void
    {
        $pessoa = Pessoa::factory()->create();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/regularizar-documento", ['cpf' => $this->cpfValido()])
            ->assertStatus(422)
            ->assertJsonPath('code', 'documento_nao_pendente');
    }

    public function test_mesclagem_reaponta_referencias_completa_campos_e_exclui_a_origem(): void
    {
        $destino = Pessoa::factory()->create(['nome' => 'Maria Silva', 'nome_social' => null, 'sexo' => 'F']);
        $origem = $this->pendente(['nome' => 'Maria S.', 'nome_social' => 'Mari']);
        $origem->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => today()->toDateString()]);
        $origem->contatos()->create(['tipo' => 'email', 'valor' => 'maria@teste.gov.br', 'principal' => true]);
        $filho = $this->pendente(['nome' => 'Filho', 'data_nascimento' => now()->subYears(5)->toDateString(), 'responsavel_id' => $origem->id]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$origem->id}/mesclar", ['destino_id' => $destino->id])
            ->assertOk()
            ->assertJsonPath('id', $destino->id);

        self::assertTrue($origem->fresh()?->trashed() ?? Pessoa::withTrashed()->find($origem->id)->trashed());
        self::assertSame(1, $destino->vinculos()->count());
        self::assertSame(1, $destino->contatos()->count());
        self::assertSame($destino->id, $filho->fresh()->responsavel_id);
        self::assertSame('Mari', $destino->fresh()->nome_social);
        self::assertSame('Maria Silva', $destino->fresh()->nome, 'o cadastro mestre não é sobrescrito');
        self::assertNotNull(DB::table('audit_logs')->where('action', 'pessoa.mesclada')->first());
    }

    public function test_mesclagem_exige_origem_com_documento_pendente(): void
    {
        $a = Pessoa::factory()->create();
        $b = Pessoa::factory()->create();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$a->id}/mesclar", ['destino_id' => $b->id])
            ->assertStatus(422)
            ->assertJsonPath('code', 'mesclagem_invalida');
    }

    public function test_mesclagem_com_ela_mesma_e_recusada(): void
    {
        $a = $this->pendente();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$a->id}/mesclar", ['destino_id' => $a->id])
            ->assertStatus(422);
    }

    public function test_mesclagem_exige_permissao_especifica(): void
    {
        $a = $this->pendente();
        $b = Pessoa::factory()->create();

        $this->como($this->usuario($this->tenant, ['cadastros.pessoas.update']), $this->tenant)
            ->postJson("/api/pessoas/{$a->id}/mesclar", ['destino_id' => $b->id])
            ->assertForbidden();
    }

    public function test_outro_tenant_nao_regulariza_nem_mescla_pessoa_alheia(): void
    {
        $pendente = $this->pendente();
        $destino = Pessoa::factory()->create();
        $outro = $this->criarTenant('tenant-b');
        $admin = $this->como($this->admin($outro), $outro);

        $admin->postJson("/api/pessoas/{$pendente->id}/regularizar-documento", ['cpf' => $this->cpfValido()])->assertForbidden();
        $admin->postJson("/api/pessoas/{$pendente->id}/mesclar", ['destino_id' => $destino->id])->assertStatus(422);

        $this->assertTrue($pendente->fresh()->documento_pendente);
        $this->assertFalse(Pessoa::withTrashed()->find($pendente->id)->trashed());
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Cadastro de pessoa física sem CPF e responsável de menor (spec pessoas: documento pendente e responsável). */
final class PessoaSemDocumentoRequestTest extends PessoasTestCase
{
    private Tenant $tenantA;
    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('tenant-a');
        $this->tenantB = $this->criarTenant('tenant-b');
    }

    public function test_cadastro_sem_cpf_cria_pessoa_pendente(): void
    {
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['nome' => 'Adulta Sem CPF', 'data_nascimento' => '1985-02-01'])
            ->assertCreated()
            ->assertJsonPath('documento_pendente', true);

        self::assertSame(1, Pessoa::query()->comDocumentoPendente()->count());
    }

    public function test_pessoa_sem_cpf_exige_data_de_nascimento(): void
    {
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['nome' => 'Sem Nascimento'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['data_nascimento']);
    }

    public function test_menor_sem_cpf_e_sem_responsavel_e_rejeitado(): void
    {
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString()])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['responsavel_id']);

        self::assertSame(0, Pessoa::count());
    }

    public function test_menor_sem_cpf_com_responsavel_pessoa_fisica_do_tenant_e_aceito(): void
    {
        $this->noTenant($this->tenantA);
        $mae = Pessoa::factory()->create(['tenant_id' => $this->tenantA->id]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString(), 'responsavel_id' => $mae->id,
            ])
            ->assertCreated()
            ->assertJsonPath('responsavel_id', $mae->id);
    }

    public function test_responsavel_de_outro_tenant_e_rejeitado(): void
    {
        $this->noTenant($this->tenantB);
        $estranha = Pessoa::factory()->create(['tenant_id' => $this->tenantB->id]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString(), 'responsavel_id' => $estranha->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['responsavel_id']);
    }

    public function test_responsavel_juridico_e_rejeitado(): void
    {
        $this->noTenant($this->tenantA);
        $empresa = Pessoa::factory()->juridica()->create(['tenant_id' => $this->tenantA->id]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString(), 'responsavel_id' => $empresa->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['responsavel_id']);
    }

    public function test_atualizacao_de_pendente_menor_nao_pode_remover_o_responsavel(): void
    {
        $this->noTenant($this->tenantA);
        $mae = Pessoa::factory()->create();
        $crianca = Pessoa::create([
            'nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString(), 'responsavel_id' => $mae->id,
        ]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->putJson("/api/pessoas/{$crianca->id}", ['responsavel_id' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['responsavel_id']);
    }

    public function test_atualizacao_de_outros_campos_do_pendente_com_responsavel_continua_valida(): void
    {
        $this->noTenant($this->tenantA);
        $mae = Pessoa::factory()->create();
        $crianca = Pessoa::create([
            'nome' => 'Criança', 'data_nascimento' => now()->subYears(8)->toDateString(), 'responsavel_id' => $mae->id,
        ]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->putJson("/api/pessoas/{$crianca->id}", ['nome' => 'Criança Renomeada'])
            ->assertOk();
    }
}

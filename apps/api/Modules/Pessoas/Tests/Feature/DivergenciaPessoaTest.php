<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Spec pessoas/unificacao-dados: "Registro e revisão de divergências". */
final class DivergenciaPessoaTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    private function divergencia(Pessoa $pessoa, string $campo = 'nome', string $doModulo = 'Nome do Módulo'): PessoaDivergencia
    {
        return PessoaDivergencia::create([
            'pessoa_id' => $pessoa->id, 'modulo' => 'escola', 'tabela' => 'escola_alunos', 'registro_id' => 7,
            'campo' => $campo, 'valor_modulo' => $doModulo, 'valor_mdm' => (string) $pessoa->getAttribute($campo),
        ]);
    }

    private function revisor(): static
    {
        return $this->como($this->usuario($this->tenant, ['cadastros.pessoas.divergencias.manage']), $this->tenant);
    }

    public function test_lista_as_divergencias_abertas_filtrando_por_modulo(): void
    {
        $this->divergencia(Pessoa::factory()->create());

        $resposta = $this->revisor()->getJson('/api/pessoas/divergencias?modulo=escola')->assertOk();

        $this->assertSame(1, $resposta->json('total'));
        $this->assertSame('Nome do Módulo', $resposta->json('data.0.valor_modulo'));
        $this->assertSame(0, $this->revisor()->getJson('/api/pessoas/divergencias?modulo=capd')->json('total'));
    }

    public function test_valor_do_modulo_prevalece_atualiza_a_pessoa_e_encerra_com_auditoria(): void
    {
        $pessoa = Pessoa::factory()->create(['nome' => 'Nome Mestre']);
        $divergencia = $this->divergencia($pessoa);

        $this->revisor()->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'modulo'])
            ->assertOk()
            ->assertJsonPath('estado', 'resolvida')
            ->assertJsonPath('decisao', 'modulo');

        $this->assertSame('Nome do Módulo', $pessoa->fresh()->nome);
        $this->assertNotNull($divergencia->fresh()->resolvida_por);
        $this->assertNotNull(DB::table('audit_logs')->where('action', 'pessoa.divergencia_resolvida')->first());
    }

    public function test_valor_do_mdm_prevalece_mantem_a_pessoa_e_encerra(): void
    {
        $pessoa = Pessoa::factory()->create(['nome' => 'Nome Mestre']);
        $divergencia = $this->divergencia($pessoa);

        $this->revisor()->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'mdm'])->assertOk();

        $this->assertSame('Nome Mestre', $pessoa->fresh()->nome);
        $this->assertSame('resolvida', $divergencia->fresh()->estado);
    }

    public function test_divergencia_resolvida_nao_pode_ser_resolvida_de_novo(): void
    {
        $divergencia = $this->divergencia(Pessoa::factory()->create());
        $this->revisor()->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'mdm'])->assertOk();

        $this->revisor()->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'modulo'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'divergencia_ja_resolvida');
    }

    public function test_decisao_invalida_e_rejeitada(): void
    {
        $divergencia = $this->divergencia(Pessoa::factory()->create());

        $this->revisor()->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'qualquer'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['decisao']);
    }

    public function test_sem_a_permissao_especifica_o_acesso_e_negado(): void
    {
        $divergencia = $this->divergencia(Pessoa::factory()->create());
        $comum = $this->como($this->usuario($this->tenant, ['cadastros.pessoas.update']), $this->tenant);

        $comum->getJson('/api/pessoas/divergencias')->assertForbidden();
        $comum->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'mdm'])->assertForbidden();
        $this->assertSame('aberta', $divergencia->fresh()->estado);
    }

    public function test_outro_tenant_nao_enxerga_nem_resolve(): void
    {
        $divergencia = $this->divergencia(Pessoa::factory()->create());
        $outro = $this->criarTenant('tenant-b');
        $revisorB = $this->como($this->usuario($outro, ['cadastros.pessoas.divergencias.manage']), $outro);

        $this->assertSame(0, $revisorB->getJson('/api/pessoas/divergencias')->json('total'));
        $revisorB->postJson("/api/pessoas/divergencias/{$divergencia->id}/resolver", ['decisao' => 'mdm'])->assertNotFound();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Quadro societário de pessoa jurídica (spec: Quadro societário de pessoa jurídica). */
final class QuadroSocietarioTest extends PessoasTestCase
{
    private Tenant $tenantA;
    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('tenant-a');
        $this->tenantB = $this->criarTenant('tenant-b');
    }

    public function test_adiciona_socio_pessoa_fisica_com_sucesso(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();
        $socio = Pessoa::factory()->create();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios", [
                'socio_pessoa_id' => $socio->id,
                'papel' => 'socio_administrador',
                'percentual_participacao' => 60,
            ])
            ->assertStatus(201)
            ->assertJsonPath('socio_pessoa_id', $socio->id);

        self::assertSame(1, $juridica->socios()->count());
    }

    public function test_pessoa_juridica_e_rejeitada_como_socia(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();
        $outraJuridica = Pessoa::factory()->juridica()->create();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios", ['socio_pessoa_id' => $outraJuridica->id])
            ->assertStatus(422);
    }

    public function test_pessoa_juridica_nao_pode_ser_socia_de_si_mesma(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios", ['socio_pessoa_id' => $juridica->id])
            ->assertStatus(422);
    }

    public function test_socia_de_outro_tenant_e_rejeitada(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();

        $this->noTenant($this->tenantB);
        $socioOutroTenant = Pessoa::factory()->create();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios", ['socio_pessoa_id' => $socioOutroTenant->id])
            ->assertStatus(404);
    }

    public function test_encerramento_de_socio_preserva_historico(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();
        $socio = Pessoa::factory()->create();
        $vinculo = $juridica->socios()->create(['socio_pessoa_id' => $socio->id, 'data_entrada' => today()->subMonth()->toDateString()]);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios/{$vinculo->id}/encerrar")
            ->assertOk();

        $vinculo->refresh();
        self::assertNotNull($vinculo->data_saida);
        self::assertSame(1, $juridica->socios()->count());
    }

    public function test_adicionar_e_encerrar_socio_sao_auditados(): void
    {
        $this->noTenant($this->tenantA);
        $juridica = Pessoa::factory()->juridica()->create();
        $socio = Pessoa::factory()->create();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios", ['socio_pessoa_id' => $socio->id])
            ->assertStatus(201);

        self::assertTrue(AuditLog::where('action', 'pessoa.socio_adicionado')->exists());

        $vinculo = $juridica->socios()->first();
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson("/api/pessoas/{$juridica->id}/socios/{$vinculo->id}/encerrar")
            ->assertOk();

        self::assertTrue(AuditLog::where('action', 'pessoa.socio_encerrado')->exists());
    }
}

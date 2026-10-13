<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Campanha\Database\Seeders\CampanhaRbacSeeder;
use Modules\Campanha\Models\Lancamento;
use Modules\Campanha\Services\AnexoService;
use Modules\Campanha\Support\Documento;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Permissões da Fase 2B, perfil Financeiro, CPF/CNPJ e anexos privados (grupo 1). */
final class PerfisOperacaoTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const NOVAS = ['campanha.agenda.manage', 'campanha.financeiro.manage', 'campanha.financeiro.view', 'campanha.materiais.manage', 'campanha.pesquisas.manage'];

    public function test_perfis_recebem_as_permissoes_da_operacao(): void
    {
        $tenant = $this->criarTenant();
        $permissoes = fn (string $slug): array => Role::query()->where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->permissions()->pluck('slug')->all();

        foreach (self::NOVAS as $p) {
            $this->assertContains($p, $permissoes('campanha_coordenacao_geral'));
            $this->assertNotContains($p, $permissoes('campanha_consulta'));
        }
        $this->assertEqualsCanonicalizing(['campanha.view', 'campanha.financeiro.view', 'campanha.financeiro.manage'], $permissoes('campanha_financeiro'));
        $this->assertNotContains('campanha.financeiro.view', $permissoes('campanha_coordenacao'));
        $this->assertContains('campanha.materiais.manage', $permissoes('campanha_coordenacao'));

        $clone = Role::query()->where('slug', 'campanha_coordenacao')->where('tenant_id', $tenant->id)->firstOrFail();
        $clone->permissions()->detach(Permission::query()->whereIn('slug', self::NOVAS)->pluck('id'));
        (new CampanhaRbacSeeder())->run();
        $this->assertContains('campanha.agenda.manage', $permissoes('campanha_coordenacao'));
    }

    public function test_coordenacao_sem_financeiro_e_financeiro_sem_equipes(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $coord = $this->usuario($tenant, ['campanha_coordenacao']);
        $financeiro = $this->usuario($tenant, ['campanha_financeiro']);
        $this->membro($campanha, $coord);
        $this->membro($campanha, $financeiro);

        $this->como($coord, $tenant, $campanha)->getJson('/api/campanha/lancamentos')->assertForbidden();
        $this->como($coord, $tenant, $campanha)->getJson('/api/campanha/financeiro/resumo')->assertForbidden();

        $this->como($financeiro, $tenant, $campanha)->postJson('/api/campanha/lancamentos', [
            'tipo' => 'despesa', 'categoria' => 'combustivel', 'valor_centavos' => 25050, 'data' => '2026-09-10', 'forma_pagamento' => 'pix',
        ])->assertCreated();
        $this->como($financeiro, $tenant, $campanha)->putJson('/api/campanha/municipios/4113700', ['situacao' => 'consolidado'])->assertForbidden();
        $this->como($financeiro, $tenant, $campanha)->postJson('/api/campanha/cabos', ['nome' => 'X', 'codigo_ibge' => 4113700])->assertForbidden();
    }

    public function test_cpf_e_cnpj(): void
    {
        $this->assertTrue(Documento::valido('529.982.247-25'));
        $this->assertTrue(Documento::valido('11.222.333/0001-81'));
        $this->assertFalse(Documento::valido('111.111.111-11'));
        $this->assertFalse(Documento::valido('11.222.333/0001-82'));
        $this->assertFalse(Documento::valido('123'));
        $this->assertSame('11.222.333/0001-81', Documento::formatar('11222333000181'));
    }

    public function test_comprovante_privado_tipo_recusado_e_troca_apaga_o_anterior(): void
    {
        Storage::fake(AnexoService::DISCO);
        Storage::fake('public');
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);
        $id = $gestao()->postJson('/api/campanha/lancamentos', ['tipo' => 'despesa', 'categoria' => 'alimentacao', 'valor_centavos' => 1000, 'data' => '2026-09-10', 'forma_pagamento' => 'dinheiro'])->json('id');

        $gestao()->post("/api/campanha/lancamentos/{$id}/comprovante", ['arquivo' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('arquivo');
        $gestao()->post("/api/campanha/lancamentos/{$id}/comprovante", ['arquivo' => UploadedFile::fake()->create('nota.pdf', 50, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('tem_comprovante', true)->assertJsonMissingPath('comprovante');
        $primeiro = $this->noTenant($tenant, fn () => Lancamento::query()->withoutGlobalScopes()->findOrFail($id)->comprovante);
        $this->assertStringStartsWith("campanha/{$tenant->id}/{$campanha->id}/lancamento/", $primeiro);
        Storage::disk(AnexoService::DISCO)->assertExists($primeiro);
        $this->assertSame([], Storage::disk('public')->allFiles());

        $gestao()->get("/api/campanha/lancamentos/{$id}/comprovante")->assertOk();
        $gestao()->post("/api/campanha/lancamentos/{$id}/comprovante", ['arquivo' => UploadedFile::fake()->image('recibo.png')], ['Accept' => 'application/json'])->assertOk();
        Storage::disk(AnexoService::DISCO)->assertMissing($primeiro);

        $coord = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($campanha, $coord);
        $this->como($coord, $tenant, $campanha)->get("/api/campanha/lancamentos/{$id}/comprovante", ['Accept' => 'application/json'])->assertForbidden();
    }
}

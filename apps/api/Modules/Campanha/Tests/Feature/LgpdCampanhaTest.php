<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campanha\Database\Seeders\CampanhaRbacSeeder;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Permissões de eleitores/demandas e LGPD da campanha (Fase 2A, grupo 1). */
final class LgpdCampanhaTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    public function test_perfis_recebem_as_permissoes_de_eleitores_e_demandas(): void
    {
        $tenant = $this->criarTenant();
        $permissoes = fn (string $slug): array => Role::query()->where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()
            ->permissions()->pluck('slug')->sort()->values()->all();
        $novas = ['campanha.demandas.manage', 'campanha.eleitores.manage', 'campanha.eleitores.view'];

        foreach ($novas as $p) {
            $this->assertContains($p, $permissoes('campanha_coordenacao_geral'));
            $this->assertContains($p, $permissoes('campanha_coordenacao'));
            $this->assertNotContains($p, $permissoes('campanha_consulta'));
        }

        // Perfil clonado antes da Fase 2A (sem as novas) recebe-as quando o seeder roda de novo.
        $clone = Role::query()->where('slug', 'campanha_coordenacao')->where('tenant_id', $tenant->id)->firstOrFail();
        $clone->permissions()->detach(Permission::query()->whereIn('slug', $novas)->pluck('id'));
        $this->assertNotContains('campanha.eleitores.view', $permissoes('campanha_coordenacao'));
        (new CampanhaRbacSeeder())->run();
        foreach ($novas as $p) {
            $this->assertContains($p, $permissoes('campanha_coordenacao'));
        }
    }

    public function test_termo_padrao_e_versao_sobe_so_quando_o_texto_muda(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant);

        $gestao->getJson("/api/campanha/campanhas/{$campanha->id}")->assertOk()
            ->assertJsonPath('lgpd_termo_versao', 1)->assertJsonPath('lgpd_retencao_dias', 90)
            ->assertJsonPath('anonimizacao_prevista', null)
            ->assertJson(fn ($json) => $json->where('lgpd_termo_vigente', fn ($t) => str_contains((string) $t, 'anonimizados em até 90 dias'))->etc());

        $url = "/api/campanha/campanhas/{$campanha->id}";
        $gestao->putJson($url, ['lgpd_termo' => 'Termo próprio.', 'lgpd_encarregado_nome' => 'Maria', 'lgpd_encarregado_contato' => 'lgpd@exemplo.com'])
            ->assertOk()->assertJsonPath('lgpd_termo_versao', 2);
        $gestao->putJson($url, ['lgpd_termo' => 'Termo próprio.', 'lgpd_retencao_dias' => 60])->assertOk()->assertJsonPath('lgpd_termo_versao', 2);
        $gestao->putJson($url, ['lgpd_termo' => 'Termo revisado.'])->assertOk()->assertJsonPath('lgpd_termo_versao', 3);
        $gestao->getJson($url)->assertJsonPath('lgpd_termo_vigente', 'Termo revisado.');
        $gestao->putJson($url, ['lgpd_retencao_dias' => 0])->assertStatus(422);
    }

    public function test_encerrar_marca_a_data_e_reabrir_limpa(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant);
        $url = "/api/campanha/campanhas/{$campanha->id}";

        $gestao->putJson($url, ['status' => 'encerrada'])->assertOk();
        $encerrada = $this->noTenant($tenant, fn (): Campanha => Campanha::query()->findOrFail($campanha->id));
        $this->assertNotNull($encerrada->encerrada_em);
        $gestao->getJson($url)->assertJsonPath('anonimizacao_prevista', $encerrada->encerrada_em->copy()->addDays(90)->toDateString());

        // Salvar de novo como encerrada não reinicia o prazo.
        $this->travel(5)->days();
        $gestao->putJson($url, ['status' => 'encerrada'])->assertOk();
        $this->assertTrue($encerrada->encerrada_em->equalTo($this->noTenant($tenant, fn () => Campanha::query()->findOrFail($campanha->id)->encerrada_em)));

        $gestao->putJson($url, ['status' => 'ativa'])->assertOk()->assertJsonPath('encerrada_em', null);
    }
}

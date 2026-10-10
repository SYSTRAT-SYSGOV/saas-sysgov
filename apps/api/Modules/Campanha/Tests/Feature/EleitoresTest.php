<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Base de eleitores, anonimização e mapa de calor (Fase 2A, grupo 3). */
final class EleitoresTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private Tenant $tenant;

    private Campanha $campanha;

    private CaboEleitoral $cabo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->basePublica();
        $this->tenant = $this->criarTenant();
        $this->campanha = $this->campanha($this->tenant);
        $this->cabo = $this->naCampanha($this->campanha, fn (): CaboEleitoral => CaboEleitoral::create(['nome' => 'Cabo João', 'codigo_ibge' => 4113700]));
        $eleitores = [
            ['Ana Souza', 4113700, 'Centro', '43999990001', -23.3045123, -51.1696123],
            ['Bruno Lima', 4113700, 'Centro', '43999990002', -23.3045499, -51.1696401],
            ['Carla Dias', 4106902, 'Batel', '41999990003', null, null],
        ];
        foreach ($eleitores as [$nome, $ibge, $bairro, $zap, $lat, $lng]) {
            $this->naCampanha($this->campanha, fn () => Eleitor::create([
                'nome' => $nome, 'codigo_ibge' => $ibge, 'bairro' => $bairro, 'whatsapp' => $zap, 'whatsapp_hash' => Eleitor::hashWhatsapp($zap),
                'data_nascimento' => '1990-05-01', 'demanda' => "Pedido de {$nome}", 'latitude' => $lat, 'longitude' => $lng, 'precisao_m' => 10,
                'cabo_id' => $ibge === 4113700 ? $this->cabo->id : null, 'consentimento_versao' => 1, 'consentido_em' => now(), 'ip' => '10.0.0.1', 'user_agent' => 'X',
            ]));
        }
    }

    private function perfil(string $perfil): static
    {
        $user = $this->usuario($this->tenant, [$perfil]);
        $this->membro($this->campanha, $user);

        return $this->como($user, $this->tenant, $this->campanha);
    }

    // ------------------------------------------------------------------ 3.1

    public function test_consulta_recebe_403_na_lista_mas_ve_indicadores_e_mapa_de_calor(): void
    {
        $this->perfil('campanha_consulta')->getJson('/api/campanha/eleitores')->assertForbidden();
        $this->perfil('campanha_consulta')->getJson('/api/campanha/eleitores/exportar')->assertForbidden();
        $indicadores = $this->perfil('campanha_consulta')->getJson('/api/campanha/eleitores/indicadores')->assertOk()
            ->assertJsonPath('total', 3)->assertJsonPath('com_localizacao', 2)
            ->assertJsonPath('por_municipio.0.municipio', 'Londrina')->assertJsonPath('por_municipio.0.total', 2)
            ->assertJsonPath('por_responsavel.0.nome', 'Cabo João');
        $this->assertStringNotContainsString('Ana', (string) $indicadores->getContent());
        $this->perfil('campanha_consulta')->getJson('/api/campanha/mapa-calor')->assertOk();
    }

    public function test_coordenacao_lista_com_filtros_e_busca(): void
    {
        $coord = fn () => $this->perfil('campanha_coordenacao');
        $coord()->getJson('/api/campanha/eleitores')->assertOk()->assertJsonPath('total', 3);
        $coord()->getJson('/api/campanha/eleitores?codigo_ibge=4113700')->assertJsonPath('total', 2)->assertJsonPath('eleitores.0.municipio', 'Londrina');
        $coord()->getJson('/api/campanha/eleitores?bairro=bat')->assertJsonPath('total', 1)->assertJsonPath('eleitores.0.nome', 'Carla Dias');
        $coord()->getJson("/api/campanha/eleitores?cabo_id={$this->cabo->id}")->assertJsonPath('total', 2)->assertJsonPath('eleitores.0.responsavel', 'Cabo João');
        $coord()->getJson('/api/campanha/eleitores?busca=bruno')->assertJsonPath('total', 1);
        $coord()->getJson('/api/campanha/eleitores?busca=0003')->assertJsonPath('total', 1)->assertJsonPath('eleitores.0.nome', 'Carla Dias');
        $coord()->getJson('/api/campanha/eleitores?de=' . now()->addDay()->toDateString())->assertJsonPath('total', 0);
        $coord()->getJson('/api/campanha/eleitores')->assertJsonMissingPath('eleitores.0.whatsapp_hash');
    }

    public function test_exportacao_csv_auditada_com_quantidade(): void
    {
        $resposta = $this->perfil('campanha_coordenacao_geral')->get('/api/campanha/eleitores/exportar?codigo_ibge=4113700')->assertOk();
        $csv = $resposta->streamedContent();
        $this->assertStringContainsString('Nome;Município', $csv);
        $this->assertStringContainsString('"Ana Souza";Londrina', $csv);
        $this->assertStringNotContainsString('Carla', $csv);

        $log = AuditLog::query()->where('action', 'eleitores.exportados')->firstOrFail();
        $this->assertSame(2, $log->after['quantidade']);
        $this->assertNotNull($log->user_id);
    }

    public function test_exclusao_a_pedido_apaga_definitivamente_e_sai_do_mapa(): void
    {
        $ana = $this->naCampanha($this->campanha, fn () => Eleitor::query()->get()->firstOrFail(fn (Eleitor $e) => $e->nome === 'Ana Souza'));
        $this->perfil('campanha_consulta')->deleteJson("/api/campanha/eleitores/{$ana->id}")->assertForbidden();

        // Vale também depois do encerramento da campanha.
        $this->noTenant($this->tenant, fn () => Campanha::query()->whereKey($this->campanha->id)->update(['status' => 'encerrada', 'encerrada_em' => now()]));
        $this->perfil('campanha_coordenacao')->deleteJson("/api/campanha/eleitores/{$ana->id}")->assertOk();

        $this->assertDatabaseMissing('campanha_eleitores', ['id' => $ana->id]);
        $this->perfil('campanha_coordenacao')->getJson('/api/campanha/mapa-calor')->assertJsonPath('pontos.0.2', 1);
        $log = AuditLog::query()->where('action', 'eleitor.excluido_a_pedido')->firstOrFail();
        $this->assertStringNotContainsString('Ana', json_encode([$log->before, $log->after]) ?: '');
    }

    public function test_eleitor_de_outra_campanha_responde_404(): void
    {
        $outra = $this->campanha($this->tenant, ['nome' => 'Outra']);
        $id = $this->naCampanha($this->campanha, fn () => Eleitor::query()->value('id'));
        $user = $this->usuario($this->tenant);
        $this->como($user, $this->tenant, $outra)->getJson("/api/campanha/eleitores/{$id}")->assertNotFound();
        $this->como($user, $this->tenant, $outra)->getJson('/api/campanha/eleitores')->assertJsonPath('total', 0);
    }

    // ------------------------------------------------------------------ 3.2

    public function test_anonimizacao_com_prazo_vencido_mantem_os_agregados(): void
    {
        $this->noTenant($this->tenant, fn () => Campanha::query()->whereKey($this->campanha->id)->update(['status' => 'encerrada', 'encerrada_em' => now()->subDays(91)]));
        $antes = $this->perfil('campanha_coordenacao')->getJson('/api/campanha/eleitores/indicadores')->json('por_municipio');

        $this->artisan('campanha:anonimizar-eleitores')->assertSuccessful();

        $eleitores = $this->naCampanha($this->campanha, fn () => Eleitor::query()->get());
        foreach ($eleitores as $e) {
            foreach (Eleitor::CAMPOS_PESSOAIS as $campo) {
                $this->assertNull($e->getAttribute($campo), $campo);
            }
            $this->assertNotNull($e->anonimizado_em);
            $this->assertNotNull($e->bairro);
        }
        $comPonto = $eleitores->firstOrFail(fn (Eleitor $e) => $e->latitude !== null);
        $this->assertSame(-23.3, $comPonto->latitude);
        $this->assertSame($antes, $this->perfil('campanha_coordenacao')->getJson('/api/campanha/eleitores/indicadores')->json('por_municipio'));
        $this->assertSame(3, AuditLog::query()->where('action', 'eleitores.anonimizados')->firstOrFail()->after['quantidade']);

        // Idempotente.
        $this->artisan('campanha:anonimizar-eleitores')->assertSuccessful();
        $this->assertSame(1, AuditLog::query()->where('action', 'eleitores.anonimizados')->count());
    }

    public function test_ainda_no_prazo_ou_reaberta_nada_e_anonimizado(): void
    {
        $this->noTenant($this->tenant, fn () => Campanha::query()->whereKey($this->campanha->id)->update(['status' => 'encerrada', 'encerrada_em' => now()->subDays(30)]));
        $this->artisan('campanha:anonimizar-eleitores')->assertSuccessful();
        $this->perfil('campanha_coordenacao_geral')->get('/api/campanha/eleitores/exportar')->assertOk();

        $this->noTenant($this->tenant, fn () => Campanha::query()->whereKey($this->campanha->id)->update(['status' => 'ativa', 'encerrada_em' => null]));
        $this->travel(200)->days();
        $this->artisan('campanha:anonimizar-eleitores')->assertSuccessful();

        $this->assertSame(0, $this->naCampanha($this->campanha, fn () => Eleitor::query()->whereNotNull('anonimizado_em')->count()));
    }

    public function test_excluir_a_campanha_apaga_os_eleitores_e_a_rotina_cuida_das_ja_excluidas(): void
    {
        $this->como($this->usuario($this->tenant), $this->tenant)->deleteJson("/api/campanha/campanhas/{$this->campanha->id}")->assertOk();
        $this->assertSame(0, \Illuminate\Support\Facades\DB::table('campanha_eleitores')->where('campanha_id', $this->campanha->id)->count());

        // Campanha excluída antes desta regra, com eleitores ainda guardados: a rotina anonimiza.
        $outra = $this->campanha($this->tenant, ['nome' => 'Antiga']);
        $this->naCampanha($outra, fn () => Eleitor::create(['nome' => 'Órfão', 'codigo_ibge' => 4113700, 'consentimento_versao' => 1, 'consentido_em' => now()]));
        $this->noTenant($this->tenant, fn () => Campanha::query()->whereKey($outra->id)->update(['deleted_at' => now()]));
        $this->artisan('campanha:anonimizar-eleitores')->assertSuccessful();
        $this->assertNull(\Illuminate\Support\Facades\DB::table('campanha_eleitores')->where('campanha_id', $outra->id)->value('nome'));
    }

    // ------------------------------------------------------------------ 3.3

    public function test_mapa_de_calor_so_com_pontos_arredondados_e_peso(): void
    {
        $resposta = $this->perfil('campanha_consulta')->getJson('/api/campanha/mapa-calor')->assertOk()
            ->assertExactJson(['pontos' => [[-23.305, -51.17, 2]]]);
        foreach (['Ana', '4399999', 'id'] as $proibido) {
            $this->assertStringNotContainsString($proibido, (string) $resposta->getContent());
        }
    }
}

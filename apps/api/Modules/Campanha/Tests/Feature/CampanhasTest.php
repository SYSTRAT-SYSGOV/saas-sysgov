<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Candidato;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;

/** Fundação do módulo, campanhas por candidato e campanha de trabalho (grupos 1 e 2). */
final class CampanhasTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const CPF_A = '529.982.247-25';

    private const CPF_B = '111.444.777-35';

    public function test_estrutura_dependencias_e_indices_por_tenant(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Campanha/module.json')), true);
        $this->assertContains('Pessoas', $json['requires']);
        $this->assertArrayHasKey('campanha.gestao.manage', $json['permissions']);
        foreach (['campanha_campanhas', 'campanha_membros', 'campanha_candidatos'] as $tabela) {
            foreach (Schema::getIndexes($tabela) as $indice) {
                if (!$indice['primary']) {
                    $this->assertSame('tenant_id', $indice['columns'][0], "{$tabela}: {$indice['name']}");
                }
            }
        }
    }

    public function test_gestao_cadastra_duas_campanhas_cada_uma_com_seu_candidato(): void
    {
        $tenant = $this->criarTenant();
        $gestao = $this->como($this->usuario($tenant), $tenant);

        $estadual = $gestao->postJson('/api/campanha/campanhas', ['nome' => 'Estadual 2026', 'ano' => 2026, 'cargo' => 'Deputado Estadual', 'uf' => 'PR'])
            ->assertCreated()->assertJsonPath('status', 'ativa')->json('id');
        $federal = $gestao->postJson('/api/campanha/campanhas', ['nome' => 'Federal 2026', 'ano' => 2026, 'cargo' => 'Deputado Federal', 'uf' => 'PR'])->json('id');

        $gestao->putJson("/api/campanha/campanhas/{$estadual}/candidato", ['cpf' => self::CPF_A, 'nome_completo' => 'Ana Souza Lima', 'nome_urna' => 'Ana Souza', 'partido' => 'PSD', 'numero' => '55123'])
            ->assertOk()->assertJsonPath('nome_completo', 'Ana Souza Lima')->assertJsonPath('cpf_mascarado', '***.982.247-**');
        $resposta = $gestao->putJson("/api/campanha/campanhas/{$federal}/candidato", ['cpf' => self::CPF_B, 'nome_completo' => 'Bruno Dias', 'nome_urna' => 'Bruno Dias'])->assertOk();

        $this->assertStringNotContainsString('11144477735', (string) $resposta->getContent());
        $this->assertStringNotContainsString('111.444.777-35', (string) $resposta->getContent());
        $gestao->getJson('/api/campanha/campanhas/minhas')->assertOk()->assertJsonCount(2, 'campanhas');
        $this->noTenant($tenant, function (): void {
            $this->assertSame(2, Candidato::query()->count());
            $this->assertSame(2, Pessoa::query()->count());
        });
        $this->assertTrue(AuditLog::query()->where('module', 'campanha')->where('action', 'candidato.criado')->exists());
    }

    public function test_cpf_invalido_e_candidato_sem_cpf_sao_recusados(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant);

        $gestao->putJson("/api/campanha/campanhas/{$campanha->id}/candidato", ['cpf' => '111.111.111-11', 'nome_urna' => 'X'])
            ->assertStatus(422)->assertJsonPath('error', 'CPF inválido.');
        $gestao->putJson("/api/campanha/campanhas/{$campanha->id}/candidato", ['nome_urna' => 'X'])
            ->assertStatus(422)->assertJsonPath('error', 'Informe o CPF do candidato.');
    }

    public function test_consulta_nao_altera_e_modulo_desabilitado_responde_403(): void
    {
        $tenant = $this->criarTenant();
        $this->como($this->usuario($tenant, ['campanha_consulta']), $tenant)
            ->postJson('/api/campanha/campanhas', ['nome' => 'X', 'ano' => 2026, 'cargo' => 'Prefeito', 'uf' => 'PR'])->assertForbidden();

        $semModulo = $this->criarTenant('sem-modulo', comModulo: false);
        $this->como($this->usuario($tenant), $semModulo)->getJson('/api/campanha/campanhas/minhas')->assertForbidden();
    }

    public function test_membro_acessa_so_as_suas_campanhas_e_a_gestao_todas(): void
    {
        $tenant = $this->criarTenant();
        $a = $this->campanha($tenant, ['nome' => 'Campanha A']);
        $b = $this->campanha($tenant, ['nome' => 'Campanha B']);
        $coordenador = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($a, $coordenador);

        $this->como($coordenador, $tenant, $a)->getJson('/api/campanha/atual')->assertOk()->assertJsonPath('nome', 'Campanha A')
            ->assertJsonPath('cores.consolidado', '#10b981')->assertJsonPath('faixas.cor_acima', '#ef4444');
        $this->como($coordenador, $tenant, $b)->getJson('/api/campanha/atual')->assertForbidden();
        $this->como($coordenador, $tenant)->getJson('/api/campanha/campanhas/minhas')->assertOk()
            ->assertJsonCount(1, 'campanhas')->assertJsonPath('campanhas.0.nome', 'Campanha A');
        $this->como($coordenador, $tenant)->getJson("/api/campanha/campanhas/{$b->id}")->assertForbidden();

        $gestao = $this->usuario($tenant);
        $this->como($gestao, $tenant, $b)->getJson('/api/campanha/atual')->assertOk();
        $this->como($gestao, $tenant)->getJson('/api/campanha/campanhas/minhas')->assertJsonCount(2, 'campanhas');
    }

    public function test_campanha_de_outro_tenant_e_sem_cabecalho(): void
    {
        $tenant = $this->criarTenant();
        $outro = $this->criarTenant('partido-b');
        $deFora = $this->campanha($outro);
        $gestao = $this->usuario($tenant);

        $this->como($gestao, $tenant, $deFora)->getJson('/api/campanha/atual')->assertNotFound();
        $this->como($gestao, $tenant)->getJson("/api/campanha/campanhas/{$deFora->id}")->assertNotFound();

        // Sem cabeçalho: com uma campanha só, ela vale; com duas, é preciso escolher.
        $unica = $this->campanha($tenant, ['nome' => 'Única']);
        $this->como($gestao, $tenant)->getJson('/api/campanha/atual')->assertOk()->assertJsonPath('id', $unica->id);
        $this->campanha($tenant, ['nome' => 'Segunda']);
        $this->como($gestao, $tenant)->getJson('/api/campanha/atual')->assertStatus(422);
    }

    public function test_campanha_encerrada_aceita_so_consulta(): void
    {
        Route::middleware(['auth:sanctum', 'tenant', 'campanha', 'bindings', 'module-access:campanha'])
            ->post('/api/campanha/_teste-escrita', fn () => response()->json(['ok' => true]));
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant, ['status' => 'encerrada']);
        $gestao = $this->usuario($tenant);

        $this->como($gestao, $tenant, $campanha)->getJson('/api/campanha/atual')->assertOk();
        $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/_teste-escrita')
            ->assertStatus(422)->assertJsonPath('message', 'Esta campanha está encerrada: não aceita alterações.');
    }

    public function test_membros_so_do_tenant_e_substituicao_da_lista(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant);
        $a = $this->usuario($tenant, ['campanha_coordenacao']);
        $b = $this->usuario($tenant, ['campanha_consulta']);
        $deFora = $this->usuario($this->criarTenant('partido-b'), ['campanha_consulta']);

        $gestao->getJson("/api/campanha/campanhas/{$campanha->id}/usuarios")->assertOk()->assertJsonCount(3, 'usuarios')
            ->assertJsonMissing(['email' => $deFora->email]);
        $this->como($a, $tenant)->getJson("/api/campanha/campanhas/{$campanha->id}/usuarios")->assertForbidden();
        $gestao = $this->como($this->usuario($tenant), $tenant);
        $gestao->putJson("/api/campanha/campanhas/{$campanha->id}/membros", ['user_ids' => [$a->id, $b->id]])->assertOk()->assertJsonCount(2, 'membros');
        $gestao->putJson("/api/campanha/campanhas/{$campanha->id}/membros", ['user_ids' => [$b->id]])->assertOk()
            ->assertJsonCount(1, 'membros')->assertJsonPath('membros.0.user_id', $b->id);
        $gestao->putJson("/api/campanha/campanhas/{$campanha->id}/membros", ['user_ids' => [$deFora->id]])
            ->assertStatus(422)->assertJsonPath('error', 'Há usuários que não pertencem a este órgão.');
        $this->noTenant($tenant, fn () => $this->assertSame(1, Campanha::query()->findOrFail($campanha->id)->membros()->count()));
    }
}

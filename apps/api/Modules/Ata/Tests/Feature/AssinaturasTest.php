<?php

declare(strict_types=1);

namespace Modules\Ata\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\Ata\Tests\Concerns\CenarioAta;
use Modules\Ata\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;

/** spec: ata › Assinaturas dos participantes (quem assinou sai da seleção). */
final class AssinaturasTest extends TestCase
{
    use CenarioAta;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_quem_assinou_sai_da_lista_de_pendentes_e_nao_assina_de_novo(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant);
        $ana = $ata['participantes'][0]['id'];

        $this->como($user, $tenant)->getJson("/api/ata/atas/{$ata['id']}/assinaturas/pendentes")->assertJsonCount(2, 'data');
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ana, 'imagem' => self::PNG])->assertCreated();

        $this->como($user, $tenant)->getJson("/api/ata/atas/{$ata['id']}/assinaturas/pendentes")->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'Bruno Lima');
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ana, 'imagem' => self::PNG])->assertStatus(409);
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.assinada']);
    }

    public function test_so_assina_depois_do_rascunho(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->criarAta($user, $tenant)->json();

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ata['participantes'][0]['id'], 'imagem' => self::PNG])->assertStatus(409);
    }

    public function test_assinatura_precisa_ser_png_valido(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant);

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ata['participantes'][0]['id'], 'imagem' => 'data:image/png;base64,AAAA'])->assertStatus(422);
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ata['participantes'][0]['id'], 'imagem' => 'data:text/html;base64,PHA+'])->assertStatus(422);
    }

    public function test_consulta_nao_assina(): void
    {
        $tenant = $this->criarTenant();
        $ata = $this->ataEmRascunho($this->usuario($tenant), $tenant);

        $this->como($this->usuario($tenant, ['ata_consulta']), $tenant)
            ->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $ata['participantes'][0]['id'], 'imagem' => self::PNG])->assertForbidden();
    }

    public function test_participante_do_cadastro_de_pessoas_usa_o_nome_do_cadastro(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $pessoa = $this->noTenant($tenant, fn () => Pessoa::query()->create(['nome' => 'Carla Mendes', 'cpf' => '52998224725']));

        $this->como($user, $tenant)->getJson('/api/ata/pessoas?q=Carl')->assertOk()->assertJsonPath('data.0.nome', 'Carla Mendes')->assertJsonMissingPath('data.0.cpf');
        $this->criarAta($user, $tenant, ['participantes' => [['pessoa_id' => $pessoa->id, 'nome' => 'Outro nome'], ['nome' => 'Avulso']]])
            ->assertCreated()->assertJsonPath('participantes.0.nome', 'Carla Mendes')->assertJsonPath('participantes.0.pessoa_id', $pessoa->id);
    }
}

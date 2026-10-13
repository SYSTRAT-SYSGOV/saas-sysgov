<?php

declare(strict_types=1);

namespace Modules\Ata\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\Ata\Tests\Concerns\CenarioAta;
use Modules\Ata\Tests\TestCase;

/** spec: ata › Ata sigilosa e escopo por secretaria; isolamento entre tenants; Validação pública. */
final class AcessoTest extends TestCase
{
    use CenarioAta;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_isolamento_entre_tenants(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $idA = $this->criarAta($this->usuario($a, ['ata_gestor']), $a)->json('id');

        $gestorB = $this->usuario($b, ['ata_gestor']);
        $this->como($gestorB, $b)->getJson('/api/ata/atas')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->getJson("/api/ata/atas/{$idA}")->assertNotFound();
    }

    public function test_usuario_so_ve_atas_da_sua_secretaria(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant, ['ata_gestor']);
        $daSaude = $this->criarAta($gestor, $tenant, ['org_unit_id' => $this->unidade($tenant, 'sms')->id])->json('id');
        $this->criarAta($gestor, $tenant);

        $educacao = $this->usuario($tenant, ['ata_consulta']);
        $this->como($educacao, $tenant)->getJson('/api/ata/atas')->assertJsonCount(1, 'data');
        $this->como($educacao, $tenant)->getJson("/api/ata/atas/{$daSaude}")->assertForbidden();
    }

    public function test_ata_sigilosa_so_para_autor_e_gestor_e_mascarada_na_lista(): void
    {
        $tenant = $this->criarTenant();
        $autor = $this->usuario($tenant);
        $id = $this->criarAta($autor, $tenant, ['sigilosa' => true, 'titulo' => 'Assunto reservado'])->json('id');
        $colega = $this->usuario($tenant);

        $this->como($autor, $tenant)->getJson("/api/ata/atas/{$id}")->assertOk();
        $this->como($this->usuario($tenant, ['ata_gestor'], null), $tenant)->getJson("/api/ata/atas/{$id}")->assertOk();
        $this->como($colega, $tenant)->getJson("/api/ata/atas/{$id}")->assertForbidden();
        $this->como($colega, $tenant)->get("/api/ata/atas/{$id}/preview")->assertForbidden();
        $this->como($colega, $tenant)->getJson('/api/ata/atas')->assertJsonPath('data.0.titulo', 'Ata sigilosa')->assertJsonPath('data.0.pode_abrir', false);
        $this->como($colega, $tenant)->getJson('/api/ata/atas?q=reservado')->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.sigilosa_acessada']);
    }

    public function test_validacao_publica(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant, ['sigilosa' => true]);
        $codigo = $ata['codigo_validacao'];
        self::assertMatchesRegularExpression('/^ATA-\d{4}-[0-9A-F]{16}$/', $codigo);

        $this->getJson("/api/public/ata/prefeitura-a/validar/{$codigo}")->assertOk()->assertJsonPath('valido', false);
        foreach ($ata['participantes'] as $p) {
            $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/assinaturas", ['participante_id' => $p['id'], 'imagem' => self::PNG]);
        }
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/finalizar")->assertOk();

        $this->flushHeaders();
        app('auth')->forgetGuards();
        $this->getJson("/api/public/ata/prefeitura-a/validar/{$codigo}")->assertOk()->assertJsonPath('valido', true)
            ->assertJsonPath('titulo', null)->assertJsonPath('redator', null)->assertJsonPath('numero', '01/' . now()->year);
        $this->getJson('/api/public/ata/prefeitura-a/validar/ATA-2026-0000000000000000')->assertNotFound();
        $this->getJson("/api/public/ata/outra-prefeitura/validar/{$codigo}")->assertNotFound();
    }

    public function test_cadastros_e_auditoria_so_para_gestor(): void
    {
        $tenant = $this->criarTenant();
        $secretario = $this->usuario($tenant);
        $gestor = $this->usuario($tenant, ['ata_gestor']);

        $this->como($secretario, $tenant)->postJson('/api/ata/tipos', ['nome' => 'Novo'])->assertForbidden();
        $this->como($secretario, $tenant)->getJson('/api/ata/auditoria')->assertForbidden();

        $this->como($gestor, $tenant)->getJson('/api/ata/tipos')->assertOk()->assertJsonFragment(['nome' => 'Ata do conselho']);
        $this->como($gestor, $tenant)->postJson('/api/ata/tipos', ['nome' => 'Assembleia'])->assertCreated();
        $this->como($gestor, $tenant)->post('/api/ata/secretarias/' . $this->unidade($tenant, 'smed')->id, [
            'sigla' => 'SEMED', 'timbrado' => \Illuminate\Http\UploadedFile::fake()->image('timbrado.png', 800, 1130),
        ])->assertOk()->assertJsonPath('data.sigla', 'SEMED')->assertJsonPath('data.tem_timbrado', true);
        $this->como($gestor, $tenant)->getJson('/api/ata/auditoria')->assertOk()->assertJsonFragment(['acao' => 'tipo.criado']);
    }
}

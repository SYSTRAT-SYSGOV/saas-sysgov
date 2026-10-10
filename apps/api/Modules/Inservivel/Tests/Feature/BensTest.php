<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Cadastro de bens; Arquivos privados (D3, D4, D12). */
final class BensTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function dados(Tenant $tenant, array $extra = []): array
    {
        return [
            'numero_patrimonial' => '2026-0001',
            'descricao' => 'Mesa de escritório em MDF',
            'situacao_id' => $this->idPapel($tenant, PapelSituacao::Inservivel),
            'secretaria_unit_id' => $this->unidade($tenant, 'smad')->id,
            'setor_unit_id' => $this->unidade($tenant, 'patrimonio')->id,
            'valor_contabil_cents' => 150046,
            'valor_avaliado_cents' => 0,
            ...$extra,
        ];
    }

    public function test_cadastra_bem_com_auditoria_e_evento(): void
    {
        $tenant = $this->criarTenant();
        $resposta = $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)
            ->postJson('/api/inservivel/bens', $this->dados($tenant))->assertCreated();

        $resposta->assertJsonPath('secretaria.sigla', 'SMAD')->assertJsonPath('situacao.papel', 'inservivel')
            ->assertJsonPath('valor_referencia_cents', 150046);
        $this->assertDatabaseHas('audit_logs', ['module' => 'inservivel', 'action' => 'bem.criado']);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.BemCadastrado']);
    }

    public function test_patrimonio_repetido_no_tenant_responde_422_mas_vale_em_outro_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $this->bem($a, '2026-0001');

        $this->como($this->usuario($a), $a)->postJson('/api/inservivel/bens', $this->dados($a))->assertStatus(422)->assertJsonValidationErrors('numero_patrimonial');
        $this->como($this->usuario($b), $b)->postJson('/api/inservivel/bens', $this->dados($b))->assertCreated();
    }

    public function test_setor_fora_da_secretaria_responde_422(): void
    {
        $tenant = $this->criarTenant();
        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/inservivel/bens', $this->dados($tenant, ['setor_unit_id' => $this->unidade($tenant, 'escola')->id]))
            ->assertStatus(422)->assertJsonPath('error', 'O setor informado não pertence à secretaria escolhida.');
    }

    public function test_situacao_de_fluxo_nao_e_escolhida_na_edicao(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $this->como($gestor, $tenant)->postJson('/api/inservivel/bens', $this->dados($tenant, ['situacao_id' => $this->idPapel($tenant, PapelSituacao::EmLote)]))
            ->assertStatus(422);

        $emLote = $this->bem($tenant, '9', PapelSituacao::EmLote);
        $this->como($gestor, $tenant)->putJson("/api/inservivel/bens/{$emLote->id}", ['situacao_id' => $this->idPapel($tenant, PapelSituacao::Disponivel)])
            ->assertStatus(422);
        $this->como($gestor, $tenant)->putJson("/api/inservivel/bens/{$emLote->id}", ['descricao' => 'Só a descrição'])->assertOk();
    }

    public function test_bem_nao_tem_rota_de_exclusao(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant);
        $this->como($this->usuario($tenant), $tenant)->deleteJson("/api/inservivel/bens/{$bem->id}")->assertStatus(405);
        $this->assertDatabaseHas('inservivel_bens', ['id' => $bem->id]);
    }

    public function test_filtros_da_listagem(): void
    {
        $tenant = $this->criarTenant();
        $this->bem($tenant, '100', extra: ['marca' => 'Tramontina']);
        $this->bem($tenant, '200', PapelSituacao::Disponivel, ['secretaria_unit_id' => $this->unidade($tenant, 'smed')->id]);
        $gestor = $this->usuario($tenant);

        $this->como($gestor, $tenant)->getJson('/api/inservivel/bens?q=tramon')->assertJsonCount(1, 'data')->assertJsonPath('data.0.numero_patrimonial', '100');
        $this->como($gestor, $tenant)->getJson('/api/inservivel/bens?papel=disponivel')->assertJsonCount(1, 'data')->assertJsonPath('data.0.numero_patrimonial', '200');
        $this->como($gestor, $tenant)->getJson('/api/inservivel/bens?secretaria_unit_id=' . $this->unidade($tenant, 'smad')->id)->assertJsonCount(1, 'data');
    }

    public function test_fotos_principal_e_arquivo_privado(): void
    {
        Storage::fake('local');
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $bem = $this->bem($tenant);

        $f1 = $this->como($gestor, $tenant)->post("/api/inservivel/bens/{$bem->id}/fotos", ['arquivo' => UploadedFile::fake()->image('a.jpg')])->assertCreated()->json('id');
        $f2 = $this->como($gestor, $tenant)->post("/api/inservivel/bens/{$bem->id}/fotos", ['arquivo' => UploadedFile::fake()->image('b.png'), 'principal' => true])->assertCreated()->json('id');
        $this->como($gestor, $tenant)->getJson("/api/inservivel/bens/{$bem->id}")->assertJsonPath('foto_principal_id', $f2);

        $this->como($gestor, $tenant)->postJson("/api/inservivel/bens/{$bem->id}/fotos/{$f1}/principal")->assertOk();
        $this->como($gestor, $tenant)->getJson('/api/inservivel/bens')->assertJsonPath('data.0.foto_principal_id', $f1);
        $this->como($gestor, $tenant)->get("/api/inservivel/bens/{$bem->id}/fotos/{$f1}")->assertOk();

        $this->como($gestor, $tenant)->post("/api/inservivel/bens/{$bem->id}/fotos", ['arquivo' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')])->assertStatus(422);

        $outro = $this->criarTenant('prefeitura-b');
        $this->como($this->usuario($outro), $outro)->get("/api/inservivel/bens/{$bem->id}/fotos/{$f1}")->assertNotFound();
    }
}

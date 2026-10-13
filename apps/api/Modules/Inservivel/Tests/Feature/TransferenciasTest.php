<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Transferência interna entre secretarias (D3, D11). */
final class TransferenciasTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    private function anunciar(User $user, Tenant $tenant, Bem $bem): int
    {
        return (int) $this->como($user, $tenant)->postJson('/api/inservivel/transferencias', ['bem_id' => $bem->id])->assertCreated()->json('id');
    }

    private function bemRecarregado(Tenant $tenant, Bem $bem): Bem
    {
        return $this->noTenant($tenant, fn (): Bem => Bem::query()->with('situacao')->findOrFail($bem->id));
    }

    public function test_fluxo_anunciar_solicitar_aprovar(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T1', PapelSituacao::Disponivel, ['setor_unit_id' => $this->unidade($tenant, 'patrimonio')->id]);
        $smad = $this->usuario($tenant, ['inservivel_servidor'], 'patrimonio');
        $smed = $this->usuario($tenant, ['inservivel_servidor'], 'escola');
        $gestor = $this->usuario($tenant);

        $id = $this->anunciar($smad, $tenant, $bem);
        self::assertSame('em_transferencia', $this->bemRecarregado($tenant, $bem)->situacao->papel?->value);
        $this->como($smed, $tenant)->getJson('/api/inservivel/transferencias')->assertJsonPath('transferencias.0.pode_solicitar', true);

        $this->como($smed, $tenant)->postJson("/api/inservivel/transferencias/{$id}/solicitar")->assertOk();
        $this->como($smed, $tenant)->postJson("/api/inservivel/transferencias/{$id}/aprovar")->assertForbidden();
        $this->como($smed, $tenant)->getJson('/api/inservivel/transferencias?escopo=solicitacoes')->assertForbidden();
        $this->como($gestor, $tenant)->getJson('/api/inservivel/transferencias?escopo=solicitacoes')->assertJsonCount(1, 'transferencias');

        $this->como($gestor, $tenant)->postJson("/api/inservivel/transferencias/{$id}/aprovar")->assertOk()->assertJsonPath('status', 'aceito');
        $depois = $this->bemRecarregado($tenant, $bem);
        self::assertSame($this->unidade($tenant, 'smed')->id, $depois->secretaria_unit_id);
        self::assertNull($depois->setor_unit_id);
        self::assertSame('disponivel', $depois->situacao->papel?->value);
        $this->assertDatabaseHas('outbox_events', ['event_type' => 'inservivel.TransferenciaAprovada']);
        $this->como($gestor, $tenant)->get("/api/inservivel/transferencias/{$id}/termo")->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_solicitar_bem_da_propria_secretaria_responde_422(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T2', PapelSituacao::Disponivel);
        $id = $this->anunciar($this->usuario($tenant, ['inservivel_servidor'], 'smad'), $tenant, $bem);

        $this->como($this->usuario($tenant, ['inservivel_servidor'], 'patrimonio'), $tenant)->postJson("/api/inservivel/transferencias/{$id}/solicitar")
            ->assertStatus(422)->assertJsonPath('error', 'Não é possível solicitar um bem da sua própria secretaria.');
    }

    public function test_usuario_sem_lotacao(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T3', PapelSituacao::Disponivel);
        $semLotacao = $this->usuario($tenant, ['inservivel_servidor']);
        $this->como($semLotacao, $tenant)->postJson('/api/inservivel/transferencias', ['bem_id' => $bem->id])->assertStatus(422);

        $id = $this->anunciar($this->usuario($tenant), $tenant, $bem);
        $this->como($semLotacao, $tenant)->postJson("/api/inservivel/transferencias/{$id}/solicitar")->assertStatus(422);
    }

    public function test_servidor_so_anuncia_bem_da_propria_secretaria(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T4', PapelSituacao::Disponivel);
        $this->como($this->usuario($tenant, ['inservivel_servidor'], 'escola'), $tenant)->postJson('/api/inservivel/transferencias', ['bem_id' => $bem->id])->assertForbidden();
    }

    public function test_recusar_volta_a_vitrine_e_cancelar_devolve_situacao(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T5', PapelSituacao::Inservivel);
        $smad = $this->usuario($tenant, ['inservivel_servidor'], 'smad');
        $smed = $this->usuario($tenant, ['inservivel_servidor'], 'smed');
        $gestor = $this->usuario($tenant);

        $id = $this->anunciar($smad, $tenant, $bem);
        $this->como($smed, $tenant)->postJson("/api/inservivel/transferencias/{$id}/solicitar")->assertOk();
        $this->como($gestor, $tenant)->postJson("/api/inservivel/transferencias/{$id}/recusar", [])->assertStatus(422);
        $this->como($gestor, $tenant)->postJson("/api/inservivel/transferencias/{$id}/recusar", ['motivo' => 'Bem reservado'])->assertOk();

        $vitrine = $this->como($smed, $tenant)->getJson('/api/inservivel/transferencias')->assertJsonCount(1, 'transferencias');
        $novo = (int) $vitrine->json('transferencias.0.id');
        self::assertNotSame($id, $novo);
        $this->como($smed, $tenant)->postJson("/api/inservivel/transferencias/{$novo}/cancelar")->assertForbidden();
        $this->como($smad, $tenant)->postJson("/api/inservivel/transferencias/{$novo}/cancelar")->assertOk();
        self::assertSame('inservivel', $this->bemRecarregado($tenant, $bem)->situacao->papel?->value);
    }

    public function test_bem_anunciado_nao_entra_em_lote_e_nao_e_anunciado_duas_vezes(): void
    {
        $tenant = $this->criarTenant();
        $bem = $this->bem($tenant, 'T6', PapelSituacao::Inservivel);
        $gestor = $this->usuario($tenant);
        $this->anunciar($gestor, $tenant, $bem);

        $this->como($gestor, $tenant)->postJson('/api/inservivel/transferencias', ['bem_id' => $bem->id])->assertStatus(422);
        $this->como($gestor, $tenant)->postJson('/api/inservivel/lotes', ['numero' => '9', 'descricao' => 'x', 'data_criacao' => '2026-10-06', 'responsavel' => 'y', 'bens' => [$bem->id]])
            ->assertStatus(422);
    }

    public function test_anunciaveis_da_secretaria(): void
    {
        $tenant = $this->criarTenant();
        $this->bem($tenant, 'A1', PapelSituacao::Disponivel);
        $this->bem($tenant, 'A2', PapelSituacao::Disponivel, ['secretaria_unit_id' => $this->unidade($tenant, 'smed')->id]);
        $this->bem($tenant, 'A3', PapelSituacao::Baixado);

        $this->como($this->usuario($tenant, ['inservivel_servidor'], 'patrimonio'), $tenant)->getJson('/api/inservivel/transferencias/anunciaveis')
            ->assertJsonCount(1, 'bens')->assertJsonPath('bens.0.numero_patrimonial', 'A1')->assertJsonPath('minha_secretaria.sigla', 'SMAD');
        $this->como($this->usuario($tenant), $tenant)->getJson('/api/inservivel/transferencias/anunciaveis')->assertJsonCount(2, 'bens');
    }
}

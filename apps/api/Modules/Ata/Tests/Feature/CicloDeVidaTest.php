<?php

declare(strict_types=1);

namespace Modules\Ata\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Modules\Ata\Tests\Concerns\CenarioAta;
use Modules\Ata\Tests\TestCase;

/** spec: ata › Criação e numeração; Rascunho trava o texto; Preview, impressão e finalização (padrão de ata). */
final class CicloDeVidaTest extends TestCase
{
    use CenarioAta;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_cria_ata_numerada_por_secretaria_e_ano_com_auditoria(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);

        $this->criarAta($user, $tenant)->assertCreated()->assertJsonPath('numero', '01/' . now()->year)->assertJsonPath('status', 'em_redacao')
            ->assertJsonPath('participantes.0.nome', 'Ana Souza')->assertJsonPath('editavel', true);
        $this->criarAta($user, $tenant)->assertCreated()->assertJsonPath('numero', '02/' . now()->year);
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.criada']);
    }

    public function test_exclusao_nao_reaproveita_o_numero(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant, ['ata_gestor']);
        $this->criarAta($gestor, $tenant)->assertCreated();
        $segunda = $this->criarAta($gestor, $tenant)->json('id');
        $this->como($gestor, $tenant)->deleteJson("/api/ata/atas/{$segunda}")->assertNoContent();

        $this->criarAta($gestor, $tenant)->assertCreated()->assertJsonPath('numero', '03/' . now()->year);
    }

    public function test_so_cria_na_secretaria_da_lotacao(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);

        $this->criarAta($user, $tenant, ['org_unit_id' => $this->unidade($tenant, 'sms')->id])->assertForbidden();
    }

    public function test_salvar_rascunho_trava_texto_dados_e_participantes(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant);

        $this->como($user, $tenant)->getJson("/api/ata/atas/{$ata['id']}")->assertJsonPath('status', 'rascunho')->assertJsonPath('editavel', false)
            ->assertJsonPath('conteudo_html', '<p>Texto final da reunião.</p>');
        $this->como($user, $tenant)->putJson("/api/ata/atas/{$ata['id']}/conteudo", ['conteudo_html' => '<p>Mudou</p>'])->assertStatus(409);
        $this->como($user, $tenant)->putJson("/api/ata/atas/{$ata['id']}", ['titulo' => 'Outro'])->assertStatus(409);
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/rascunho", ['conteudo_html' => '<p>De novo</p>'])->assertStatus(409);
        $this->assertDatabaseHas('atas', ['id' => $ata['id'], 'titulo' => 'Reunião do conselho escolar', 'conteudo_html' => '<p>Texto final da reunião.</p>']);
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.rascunho_salvo']);
    }

    public function test_rascunho_exige_texto(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->json('id');

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/rascunho", ['conteudo_html' => '<p> </p>'])->assertStatus(422);
    }

    public function test_conteudo_e_sanitizado(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->json('id');

        $this->como($user, $tenant)->putJson("/api/ata/atas/{$id}/conteudo", [
            'conteudo_html' => '<p onclick="x()" style="color: #ef4444; position: fixed">Oi <script>alert(1)</script><a href="javascript:x">link</a><img src=x onerror=y></p>',
        ])->assertOk()->assertJsonPath('conteudo_html', '<p style="color: #ef4444">Oi link</p>');
    }

    public function test_finalizar_exige_rascunho_e_todas_as_assinaturas(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->json('id');

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/finalizar")->assertStatus(409);

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/rascunho", ['conteudo_html' => '<p>Texto.</p>'])->assertOk();
        $participantes = $this->como($user, $tenant)->getJson("/api/ata/atas/{$id}")->json('participantes');
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/assinaturas", ['participante_id' => $participantes[0]['id'], 'imagem' => self::PNG])->assertCreated();

        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/finalizar")->assertStatus(422)->assertJsonFragment(['error' => 'Faltam assinaturas: Bruno Lima.']);
    }

    public function test_fluxo_completo_preview_finaliza_guarda_pdf_e_fica_imutavel(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant);
        $id = $ata['id'];

        $preview = $this->como($user, $tenant)->get("/api/ata/atas/{$id}/preview")->assertOk();
        self::assertStringStartsWith('%PDF', (string) $preview->getContent());
        $this->assertDatabaseHas('atas', ['id' => $id, 'pdf_path' => null]);

        foreach ($this->como($user, $tenant)->getJson("/api/ata/atas/{$id}")->json('participantes') as $p) {
            $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/assinaturas", ['participante_id' => $p['id'], 'imagem' => self::PNG])->assertCreated();
        }
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/finalizar")->assertOk()->assertJsonPath('status', 'finalizada')->assertJsonPath('tem_pdf', true);

        $registro = $this->noTenant($tenant, fn () => \Modules\Ata\Models\Ata::query()->findOrFail($id));
        $conteudo = Storage::disk('local')->get((string) $registro->pdf_path);
        self::assertSame($registro->pdf_sha256, hash('sha256', (string) $conteudo));

        $this->como($user, $tenant)->get("/api/ata/atas/{$id}/pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/finalizar")->assertStatus(409);
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$id}/assinaturas", ['participante_id' => 1, 'imagem' => self::PNG])->assertStatus(409);
        $this->como($this->usuario($tenant, ['ata_gestor']), $tenant)->deleteJson("/api/ata/atas/{$id}")->assertStatus(409);
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.finalizada']);
    }
}

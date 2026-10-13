<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Multiprofissional\Tests\Concerns\CenarioMultiprofissional;
use Modules\Multiprofissional\Tests\TestCase;
use App\Models\AuditLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Multiprofissional\Models\Condicao;

final class AcompanhadosTest extends TestCase
{
    use CenarioMultiprofissional;
    use RefreshDatabase;

    /** @return array{0: \App\Models\Tenant, 1: \App\Models\User, 2: int, 3: Condicao} */
    private function acompanhadoComCondicao(): array
    {
        $t = $this->criarTenant();
        $prof = $this->usuario($t, ['multiprofissional_profissional']);
        $condicao = $this->noTenant($t, fn () => Condicao::create(['nome' => 'Transtorno do Espectro Autista', 'cid' => 'F84.0']));

        $id = $this->como($prof, $t)->postJson('/api/multiprofissional/acompanhados', [
            'aluno_id' => $this->dado($t, 'ana')->id,
            'observacoes' => 'Precisa de mediador em sala.',
            'condicoes' => [['id' => $condicao->id, 'diagnosticado_em' => '2025-03-10']],
        ])->assertCreated()->json('data.id');

        return [$t, $prof, $id, $condicao];
    }

    public function test_quem_acompanha_ve_condicoes_e_consulta_nao(): void
    {
        [$t, $prof, $id] = $this->acompanhadoComCondicao();
        $consulta = $this->usuario($t, ['multiprofissional_consulta']);

        $this->como($prof, $t)->getJson("/api/multiprofissional/acompanhados/{$id}")->assertOk()
            ->assertJsonPath('data.condicoes.0.cid', 'F84.0')
            ->assertJsonPath('data.observacoes', 'Precisa de mediador em sala.')
            ->assertJsonPath('data.aluno.escola', 'Escola Municipal Centro');

        $this->como($consulta, $t)->getJson("/api/multiprofissional/acompanhados/{$id}")->assertOk()
            ->assertJsonPath('data.aluno.nome', 'ANA CLARA SOUZA')
            ->assertJsonPath('data.condicoes', null)
            ->assertJsonPath('data.laudos', null)
            ->assertJsonPath('data.observacoes', null);
        $this->como($consulta, $t)->getJson('/api/multiprofissional/acompanhados')->assertOk()->assertJsonPath('data.0.condicoes', null);
        $this->como($consulta, $t)->postJson('/api/multiprofissional/acompanhados', ['aluno_id' => $this->dado($t, 'bruno')->id])->assertForbidden();
    }

    public function test_estudante_so_pode_ser_acompanhado_uma_vez(): void
    {
        [$t, $prof] = $this->acompanhadoComCondicao();

        $this->como($prof, $t)->postJson('/api/multiprofissional/acompanhados', ['aluno_id' => $this->dado($t, 'ana')->id])
            ->assertUnprocessable()->assertJson(['error' => 'Esse estudante já é acompanhado.']);
    }

    public function test_laudo_privado_com_download_auditado(): void
    {
        Storage::fake('local');
        [$t, $prof, $id, $condicao] = $this->acompanhadoComCondicao();
        $consulta = $this->usuario($t, ['multiprofissional_consulta']);

        $laudo = $this->como($prof, $t)->post("/api/multiprofissional/acompanhados/{$id}/laudos", [
            'arquivo' => UploadedFile::fake()->create('laudo.pdf', 120, 'application/pdf'),
            'descricao' => 'Laudo neurológico',
            'emitente' => 'Dr. Exemplo',
            'emitido_em' => '2025-03-10',
            'condicao_id' => $condicao->id,
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->como($consulta, $t)->get("/api/multiprofissional/acompanhados/{$id}/laudos/{$laudo}")->assertForbidden();
        $this->como($prof, $t)->get("/api/multiprofissional/acompanhados/{$id}/laudos/{$laudo}")->assertOk();

        self::assertTrue(AuditLog::query()->where('module', 'multiprofissional')->where('action', 'laudo.baixado')->exists());
        self::assertSame(1, count(Storage::disk('local')->allFiles("multiprofissional/{$t->id}/laudos")));

        $this->como($prof, $t)->deleteJson("/api/multiprofissional/acompanhados/{$id}/laudos/{$laudo}")->assertNoContent();
        self::assertSame(0, count(Storage::disk('local')->allFiles("multiprofissional/{$t->id}/laudos")));
    }

    public function test_laudo_rejeita_arquivo_executavel(): void
    {
        Storage::fake('local');
        [$t, $prof, $id] = $this->acompanhadoComCondicao();

        $this->como($prof, $t)->post("/api/multiprofissional/acompanhados/{$id}/laudos", [
            'arquivo' => UploadedFile::fake()->create('script.php', 1, 'application/x-php'),
            'descricao' => 'Arquivo suspeito',
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('arquivo');
    }
}

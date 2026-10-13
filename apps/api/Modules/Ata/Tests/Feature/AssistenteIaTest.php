<?php

declare(strict_types=1);

namespace Modules\Ata\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Modules\Ata\Tests\Concerns\CenarioAta;
use Modules\Ata\Tests\TestCase;

/** spec: ata › Redação por escrita, voz e Assistente IA. */
final class AssistenteIaTest extends TestCase
{
    use CenarioAta;
    use RefreshDatabase;

    private function audio(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('chunk_0.webm', str_repeat("\x1A\x45\xDF\xA3", 64))->mimeType('audio/webm');
    }

    public function test_sem_chave_responde_503(): void
    {
        config(['ata.ia.chave' => null]);
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->assertJsonPath('ia_disponivel', false)->json('id');

        $this->como($user, $tenant)->post("/api/ata/atas/{$id}/ia", ['modo' => 2, 'audio' => [$this->audio()]], ['Accept' => 'application/json'])->assertStatus(503);
    }

    public function test_gera_texto_sanitizado_sem_gravar_na_ata(): void
    {
        config(['ata.ia.chave' => 'chave-de-teste']);
        Http::fake([
            '*/upload/v1beta/files' => Http::response(['file' => ['uri' => 'https://files/abc', 'mimeType' => 'audio/webm']]),
            '*:generateContent' => Http::response(['candidates' => [['content' => ['parts' => [['text' => "```html\n<p>Decidiu-se <strong>aprovar</strong>.</p><script>x</script>\n```"]]]]]]),
        ]);
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->json('id');

        $this->como($user, $tenant)->post("/api/ata/atas/{$id}/ia", ['modo' => 2, 'audio' => [$this->audio()]], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('texto', '<p>Decidiu-se <strong>aprovar</strong>.</p>');
        Http::assertSent(fn ($r) => $r->hasHeader('x-goog-api-key', 'chave-de-teste') && !str_contains($r->url(), 'key='));
        $this->assertDatabaseHas('audit_logs', ['module' => 'ata', 'action' => 'ata.ia_gerada']);
    }

    public function test_erro_do_provedor_responde_422(): void
    {
        config(['ata.ia.chave' => 'chave-de-teste']);
        Http::fake(['*' => Http::response(['error' => 'quota'], 429)]);
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $id = $this->criarAta($user, $tenant)->json('id');

        $this->como($user, $tenant)->post("/api/ata/atas/{$id}/ia", ['modo' => 3, 'audio' => [$this->audio()]], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_ia_bloqueada_depois_do_rascunho(): void
    {
        config(['ata.ia.chave' => 'chave-de-teste']);
        Http::fake();
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant);
        $ata = $this->ataEmRascunho($user, $tenant);

        $this->como($user, $tenant)->post("/api/ata/atas/{$ata['id']}/ia", ['modo' => 2, 'audio' => [$this->audio()]], ['Accept' => 'application/json'])->assertStatus(409);
        Http::assertNothingSent();
    }
}

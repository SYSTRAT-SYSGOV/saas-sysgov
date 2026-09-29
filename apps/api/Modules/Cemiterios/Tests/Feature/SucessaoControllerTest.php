<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class SucessaoControllerTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_index_exige_autenticacao(): void
    {
        $this->getJson('/api/cemiterios/sucessoes')->assertUnauthorized();
    }

    public function test_index_pagina_e_filtra_por_estado_e_via(): void
    {
        $admin = $this->admin($this->tenant);
        $emAnalise = $this->novaSucessao('inventario_judicial');
        $emAnalise->update(['estado' => 'em_analise']);
        $this->novaSucessao('alvara_judicial');

        $resp = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/sucessoes?estado=em_analise');

        $resp->assertOk();
        self::assertSame(1, $resp->json('total'));
        self::assertSame('inventario_judicial', $resp->json('data.0.via'));
    }

    public function test_index_respeita_per_page(): void
    {
        $admin = $this->admin($this->tenant);
        for ($i = 0; $i < 3; $i++) {
            $this->novaSucessao('arrolamento');
        }

        $resp = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/sucessoes?per_page=2');

        $resp->assertOk();
        self::assertCount(2, $resp->json('data'));
        self::assertSame(3, $resp->json('total'));
    }

    public function test_show_retorna_404_para_inexistente(): void
    {
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/sucessoes/999999')->assertNotFound();
    }

    public function test_store_valida_campos_obrigatorios(): void
    {
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/sucessoes', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['concession_id', 'via']);
    }

    public function test_store_rejeita_via_invalida(): void
    {
        $admin = $this->admin($this->tenant);
        $concessao = $this->novaConcessao();

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/sucessoes', [
            'concession_id' => $concessao->id,
            'via' => 'via_que_nao_existe',
        ])->assertUnprocessable()->assertJsonValidationErrors(['via']);
    }

    public function test_update_bloqueia_processo_em_estado_terminal(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');
        $sucessao->update(['estado' => 'sucedida']);

        $this->como($admin, $this->tenant)->putJson("/api/cemiterios/sucessoes/{$sucessao->id}", [
            'processo_referencia' => 'NOVO',
        ])->assertUnprocessable();
    }

    public function test_destroy_bloqueia_fora_de_estado_terminal(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');

        $this->como($admin, $this->tenant)->deleteJson("/api/cemiterios/sucessoes/{$sucessao->id}")
            ->assertStatus(422);
    }

    public function test_destroy_permite_em_estado_terminal(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');
        $sucessao->update(['estado' => 'arquivada']);

        $this->como($admin, $this->tenant)->deleteJson("/api/cemiterios/sucessoes/{$sucessao->id}")
            ->assertOk();

        self::assertSoftDeleted($sucessao);
    }

    public function test_herdeiro_destroy_exige_processo_em_analise(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');
        $sucessao->update(['estado' => 'em_analise']);

        $herdeiro = $sucessao->herdeiros()->create([
            'nome' => 'Herdeiro X',
            'parentesco' => 'filho',
            'ordem' => 1,
        ]);

        $sucessao->update(['estado' => 'validada']);

        $this->como($admin, $this->tenant)
            ->deleteJson("/api/cemiterios/sucessoes/{$sucessao->id}/herdeiros/{$herdeiro->id}")
            ->assertStatus(422);
    }

    public function test_herdeiro_destroy_remove_quando_em_analise(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');
        $sucessao->update(['estado' => 'em_analise']);

        $herdeiro = $sucessao->herdeiros()->create([
            'nome' => 'Herdeiro Y',
            'parentesco' => 'filho',
            'ordem' => 1,
        ]);

        $this->como($admin, $this->tenant)
            ->deleteJson("/api/cemiterios/sucessoes/{$sucessao->id}/herdeiros/{$herdeiro->id}")
            ->assertOk();

        self::assertSoftDeleted($herdeiro);
    }

    public function test_documento_download_retorna_url_assinada(): void
    {
        Storage::disk('s3')->buildTemporaryUrlsUsing(
            fn (string $path, \DateTimeInterface $expiration) => "https://fake-s3.test/{$path}"
        );
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');
        $documento = $sucessao->documentos()->create([
            'tipo' => 'certidao_obito',
            'arquivo' => 'tenant/1/doc.pdf',
            'hash' => hash('sha256', 'x'),
        ]);

        $this->como($admin, $this->tenant)
            ->getJson("/api/cemiterios/sucessoes/{$sucessao->id}/documentos/{$documento->id}/download")
            ->assertOk()
            ->assertJsonStructure(['download_url', 'expires_at']);
    }

    public function test_documento_store_faz_upload_e_calcula_hash(): void
    {
        $admin = $this->admin($this->tenant);
        $sucessao = $this->novaSucessao('inventario_judicial');

        $resp = $this->como($admin, $this->tenant)->post(
            "/api/cemiterios/sucessoes/{$sucessao->id}/documentos",
            [
                'tipo' => 'certidao_obito',
                'arquivo' => UploadedFile::fake()->createWithContent('certidao.pdf', 'conteudo-do-teste'),
            ],
            ['Accept' => 'application/json']
        );

        $resp->assertCreated();
        self::assertSame(hash('sha256', 'conteudo-do-teste'), $resp->json('hash'));
    }

    private function novaConcessao(): Concessao
    {
        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Controller',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'controller-' . uniqid()),
        ]);

        return Concessao::create([
            'numero' => 'CON-CTRL-' . uniqid(),
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);
    }

    private function novaSucessao(string $via): Sucessao
    {
        $concessao = $this->novaConcessao();

        return Sucessao::create([
            'concession_id' => $concessao->id,
            'park_id' => $concessao->jazigo->park_id,
            'plot_id' => $concessao->plot_id,
            'via' => $via,
            'estado' => 'solicitada',
            'lock_version' => 1,
        ]);
    }
}

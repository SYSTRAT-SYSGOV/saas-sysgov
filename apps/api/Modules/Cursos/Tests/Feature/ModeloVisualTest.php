<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Services\LeiauteCertificado;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Modelo visual: validação do leiaute, fundos e pré-visualização (change cursos-construtor-visual-certificado, 3.3). */
final class ModeloVisualTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
    }

    /** @param array<string, mixed> $extra */
    private function criarVisual(array $extra = []): int
    {
        return (int) $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'Visual', 'tipo' => 'visual', 'titulo' => 'Certificado', 'corpo' => 'Certificamos que {{participante}} concluiu {{curso}}.', ...$extra,
        ])->assertCreated()->json('id');
    }

    /** @return list<array<string, mixed>> */
    private function leiauteBase(): array
    {
        return LeiauteCertificado::padrao('paisagem');
    }

    public function test_modelo_visual_novo_recebe_leiaute_inicial_com_qr(): void
    {
        $id = $this->criarVisual();
        $modelo = $this->noTenant($this->tenant, fn () => ModeloCertificado::findOrFail($id));

        $this->assertSame('visual', $modelo->tipo);
        $this->assertSame(1, collect((array) $modelo->elementos)->where('tipo', 'qrcode')->count());
    }

    public function test_elemento_fora_da_pagina_e_recusado(): void
    {
        $elementos = $this->leiauteBase();
        $elementos[] = ['id' => 'fora', 'tipo' => 'texto', 'campo' => 'curso', 'x' => 900, 'y' => 100, 'largura' => 100];

        $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'V', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'elementos' => $elementos,
        ]);
        $this->assertErroDeNegocio($resposta, 'fora da página');
    }

    public function test_sem_qr_e_com_dois_qr_sao_recusados(): void
    {
        $semQr = array_values(array_filter($this->leiauteBase(), fn (array $e): bool => $e['tipo'] !== 'qrcode'));
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'V', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'elementos' => $semQr,
        ]), 'precisa do QR code');

        $doisQr = [...$this->leiauteBase(), ['id' => 'qr2', 'tipo' => 'qrcode', 'x' => 700, 'y' => 400, 'largura' => 80]];
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'V', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'elementos' => $doisQr,
        ]), 'único QR code');
    }

    public function test_campo_desconhecido_em_texto_livre_e_recusado(): void
    {
        $elementos = [...$this->leiauteBase(), ['id' => 'livre', 'tipo' => 'texto', 'texto' => 'CPF: {{cpf_completo}}', 'x' => 60, 'y' => 300, 'largura' => 300]];

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'V', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'elementos' => $elementos,
        ]), '{{cpf_completo}}');
    }

    public function test_assinatura_de_outro_orgao_e_inativa_nova_sao_recusadas(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $alheia = $this->noTenant($outro, fn () => Assinatura::create(['nome' => 'De fora']));
        $inativa = $this->noTenant($this->tenant, fn () => Assinatura::create(['nome' => 'Antiga', 'ativa' => false]));

        foreach ([[$alheia->id, 'assinatura não encontrada'], [$inativa->id, 'está inativa']] as [$id, $mensagem]) {
            $elementos = [...$this->leiauteBase(), ['id' => 'a', 'tipo' => 'assinatura', 'assinatura_id' => $id, 'x' => 300, 'y' => 400, 'largura' => 150]];
            $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
                'nome' => 'V', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'elementos' => $elementos,
            ]), $mensagem);
        }
    }

    public function test_assinatura_desativada_continua_valendo_no_modelo_que_ja_a_usa(): void
    {
        $assinatura = $this->noTenant($this->tenant, fn () => Assinatura::create(['nome' => 'Diretora']));
        $elementos = [...$this->leiauteBase(), ['id' => 'a', 'tipo' => 'assinatura', 'assinatura_id' => $assinatura->id, 'x' => 300, 'y' => 400, 'largura' => 150]];
        $id = $this->criarVisual(['elementos' => $elementos]);
        $this->noTenant($this->tenant, fn () => $assinatura->update(['ativa' => false]));

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/modelos-certificado/{$id}", ['elementos' => $elementos, 'titulo' => 'Novo título'])
            ->assertOk();
    }

    public function test_fundo_e_salvo_em_jpeg_e_extensao_falsa_e_recusada(): void
    {
        $id = $this->criarVisual();

        $caminho = $this->como($this->admin, $this->tenant)
            ->post("/api/cursos/modelos-certificado/{$id}/fundo", ['imagem' => UploadedFile::fake()->image('fundo.png', 3000, 2000)])
            ->assertOk()->json('fundo_path');
        $info = getimagesize(Storage::disk('public')->path($caminho));
        $this->assertSame(IMAGETYPE_JPEG, $info[2]);
        $this->assertSame(2480, max($info[0], $info[1]));

        $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/modelos-certificado/{$id}/fundo", ['imagem' => UploadedFile::fake()->createWithContent('falso.png', 'não é imagem')])
            ->assertStatus(422);
    }

    public function test_pre_visualizacao_gera_pdf_sem_gravar_e_aceita_alteracoes_nao_salvas(): void
    {
        $id = $this->criarVisual();
        $elementos = [...$this->leiauteBase(), ['id' => 'extra', 'tipo' => 'texto', 'texto' => 'Emitido por {{orgao}}', 'x' => 60, 'y' => 400, 'largura' => 300]];

        $resposta = $this->como($this->admin, $this->tenant)->post("/api/cursos/modelos-certificado/{$id}/pre-visualizar", ['elementos' => $elementos]);

        $resposta->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', (string) $resposta->getContent());
        $this->noTenant($this->tenant, function () use ($id): void {
            $this->assertSame(0, Certificado::count());
            $this->assertCount(5, ModeloCertificado::findOrFail($id)->elementos); // não salvou o elemento extra
        });
    }
}

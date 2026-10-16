<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Bibliotecas de fundos e de modelos de texto (change cursos-construtor-visual-certificado, D8). */
final class BibliotecaCertificadoTest extends TestCase
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

    public function test_cadastra_fundo_em_jpeg_com_orientacao_da_imagem(): void
    {
        $paisagem = $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', [
            'nome' => 'Fundo oficial', 'descricao' => 'A4 horizontal', 'imagem' => UploadedFile::fake()->image('fundo.png', 1754, 1240),
        ])->assertCreated()->assertJsonPath('orientacao', 'paisagem')->assertJsonPath('ativo', true)->json();
        $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', [
            'nome' => 'Retrato', 'imagem' => UploadedFile::fake()->image('r.jpg', 1240, 1754),
        ])->assertCreated()->assertJsonPath('orientacao', 'retrato');

        $this->assertStringEndsWith('.jpg', $paisagem['imagem_path']);
        Storage::disk('public')->assertExists($paisagem['imagem_path']);
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/fundos')->assertOk()->assertJsonCount(2, 'fundos');
        $this->assertDatabaseHas('audit_logs', ['action' => 'fundo.criado']);
    }

    public function test_fundo_com_extensao_falsa_e_recusado(): void
    {
        $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', [
            'nome' => 'Falso', 'imagem' => UploadedFile::fake()->createWithContent('fundo.png', '%PDF-1.4 falso'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_desativa_e_troca_a_imagem_do_fundo_mantendo_a_anterior(): void
    {
        $fundo = $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', ['nome' => 'F', 'imagem' => UploadedFile::fake()->image('f.png', 800, 600)])->json();

        $novo = $this->como($this->admin, $this->tenant)->post("/api/cursos/fundos/{$fundo['id']}", ['ativo' => '0', 'imagem' => UploadedFile::fake()->image('g.png', 800, 600)])
            ->assertOk()->assertJsonPath('ativo', false)->json();

        $this->assertNotSame($fundo['imagem_path'], $novo['imagem_path']);
        Storage::disk('public')->assertExists([$fundo['imagem_path'], $novo['imagem_path']]);
    }

    public function test_cadastra_texto_e_recusa_campo_desconhecido(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', [
            'nome' => 'Padrão Conclusão', 'tipo_certificado' => 'Certificado de Conclusão',
            'texto_principal' => 'Certificamos que {{participante}} concluiu {{curso}} com {{carga_horaria}}.',
            'texto_complementar' => '{{orgao}}, {{data_emissao}}.',
        ])->assertCreated()->assertJsonPath('tipo_certificado', 'Certificado de Conclusão');

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', [
            'nome' => 'Errado', 'texto_principal' => 'CPF {{cpf_do_pai}}',
        ]), '{{cpf_do_pai}}');

        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/textos')->assertOk()
            ->assertJsonCount(1, 'textos')
            ->assertJsonPath('campos.0', 'NOME');
    }

    public function test_fundo_e_texto_em_uso_nao_sao_excluidos_e_os_livres_sim(): void
    {
        $fundo = $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', ['nome' => 'F', 'imagem' => UploadedFile::fake()->image('f.png', 800, 600)])->json('id');
        $livre = $this->como($this->admin, $this->tenant)->post('/api/cursos/fundos', ['nome' => 'L', 'imagem' => UploadedFile::fake()->image('l.png', 800, 600)])->json('id');
        $texto = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', ['nome' => 'T', 'texto_principal' => 'x'])->json('id');
        $this->noTenant($this->tenant, fn () => ModeloCertificado::create(['nome' => 'Leiaute do curso', 'tipo' => 'visual', 'titulo' => 'C', 'corpo' => 'x', 'fundo_id' => $fundo, 'texto_id' => $texto]));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/fundos/{$fundo}"), 'Desative-o');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/textos/{$texto}"), 'Desative-o');
        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/fundos/{$livre}")->assertOk();
    }

    public function test_participante_nao_acessa_as_bibliotecas(): void
    {
        $participante = $this->usuario($this->tenant, ['participante_cursos']);

        $this->como($participante, $this->tenant)->getJson('/api/cursos/fundos')->assertForbidden();
        $this->como($participante, $this->tenant)->postJson('/api/cursos/textos', ['nome' => 'T', 'texto_principal' => 'x'])->assertForbidden();
    }

    public function test_lista_so_os_itens_do_proprio_orgao(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $this->noTenant($outro, fn () => \Modules\Cursos\Models\TextoCertificado::create(['nome' => 'De fora', 'texto_principal' => 'x']));

        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/textos')->assertOk()->assertJsonCount(0, 'textos');
    }
}

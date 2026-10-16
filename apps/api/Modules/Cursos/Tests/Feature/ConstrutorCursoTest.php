<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Enums\TipoCertificado;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Fundo;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\TextoCertificado;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Construtor visual por curso (change cursos-construtor-visual-certificado, D8). */
final class ConstrutorCursoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private Curso $curso;

    private int $fundo;

    private int $texto;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Gestão Pública']);
        $this->fundo = (int) $this->como($this->admin, $this->tenant)
            ->post('/api/cursos/fundos', ['nome' => 'Fundo', 'imagem' => UploadedFile::fake()->image('f.png', 1754, 1240)])->json('id');
        $this->texto = (int) $this->como($this->admin, $this->tenant)->postJson('/api/cursos/textos', [
            'nome' => 'Conclusão', 'tipo_certificado' => 'Certificado de Conclusão',
            'texto_principal' => 'Certificamos que {{participante}} concluiu {{curso}}.',
            'texto_complementar' => 'Emitido por {{orgao}}.',
        ])->json('id');
    }

    /** @return list<array<string, mixed>> */
    private function elementos(?int $assinatura = null): array
    {
        $lista = [
            ['id' => 'titulo', 'tipo' => 'texto', 'campo' => 'titulo', 'x' => 50, 'y' => 120, 'largura' => 742, 'tamanho' => 24, 'alinhamento' => 'centro'],
            ['id' => 'corpo', 'tipo' => 'texto', 'campo' => 'corpo', 'x' => 100, 'y' => 250, 'largura' => 642, 'tamanho' => 14, 'alinhamento' => 'centro'],
            ['id' => 'complementar', 'tipo' => 'texto', 'campo' => 'complementar', 'x' => 100, 'y' => 320, 'largura' => 642],
            ['id' => 'qrcode', 'tipo' => 'qrcode', 'x' => 40, 'y' => 450, 'largura' => 80],
            ['id' => 'codigo', 'tipo' => 'texto', 'texto' => 'Código Autenticidade: {{codigo}}', 'x' => 40, 'y' => 540, 'largura' => 250, 'tamanho' => 8],
        ];
        if ($assinatura !== null) {
            $lista[] = ['id' => "ass-{$assinatura}", 'tipo' => 'assinatura', 'assinatura_id' => $assinatura, 'x' => 340, 'y' => 420, 'largura' => 160, 'mostrar_textos' => true];
        }

        return $lista;
    }

    private function emitir(ModeloCertificado $modelo): Certificado
    {
        $participante = Participante::create(['nome' => 'Maria da Silva', 'email' => 'm' . uniqid() . '@x.gov']);

        return app(CertificadoService::class)->emitir($modelo, $participante, TipoCertificado::Curso, [
            'curso' => 'Gestão Pública', 'carga_horaria_minutos' => 600,
            'inicio' => Carbon::parse('2026-09-01'), 'fim' => Carbon::parse('2026-09-30'),
        ], []);
    }

    public function test_salvar_cria_o_leiaute_do_curso_e_o_vincula(): void
    {
        $assinatura = $this->noTenant($this->tenant, fn () => Assinatura::create(['nome' => 'Tatiana Assuiti', 'cargo' => 'Secretária']))->id;

        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/cursos/{$this->curso->id}/leiaute")->assertOk()->assertJsonPath('leiaute', null);

        $id = $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos($assinatura),
        ])->assertOk()
            ->assertJsonPath('leiaute.tipo', 'visual')
            ->assertJsonPath('leiaute.curso_id', $this->curso->id)
            ->assertJsonPath('leiaute.orientacao', 'paisagem')
            ->json('leiaute.id');

        // Salvar de novo atualiza o mesmo modelo.
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos(), 'verso_ativo' => true,
        ])->assertOk()->assertJsonPath('leiaute.id', $id)->assertJsonPath('leiaute.verso_ativo', true);

        $this->noTenant($this->tenant, function () use ($id): void {
            $this->assertSame($id, $this->curso->refresh()->modelo_certificado_id);
            $this->assertSame(1, ModeloCertificado::query()->where('curso_id', $this->curso->id)->count());
        });
        $this->assertDatabaseHas('audit_logs', ['action' => 'leiaute_curso.salvo']);
    }

    public function test_certificado_sai_com_fundo_e_texto_da_biblioteca_e_correcao_vale_para_os_proximos(): void
    {
        $assinatura = $this->noTenant($this->tenant, fn () => Assinatura::create(['nome' => 'Tatiana Assuiti', 'cargo' => 'Secretária']))->id;
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos($assinatura),
        ])->assertOk();

        $this->noTenant($this->tenant, function (): void {
            $modelo = ModeloCertificado::query()->where('curso_id', $this->curso->id)->firstOrFail();
            $primeiro = $this->emitir($modelo);
            $html = app(CertificadoService::class)->html($primeiro);

            $this->assertSame(Fundo::query()->findOrFail($this->fundo)->imagem_path, $primeiro->dados['leiaute']['fundo_path']);
            $this->assertStringContainsString('Certificado de Conclusão', $html);
            $this->assertStringContainsString('Certificamos que Maria da Silva concluiu Gestão Pública.', $html);
            $this->assertStringContainsString('Emitido por', $html);
            $this->assertStringContainsString('Tatiana Assuiti', $html);

            TextoCertificado::query()->findOrFail($this->texto)->update(['texto_principal' => 'Texto corrigido para {{participante}}.']);
            $segundo = $this->emitir($modelo->refresh());

            $this->assertStringContainsString('Texto corrigido para Maria da Silva.', app(CertificadoService::class)->html($segundo));
            $this->assertStringContainsString('Certificamos que Maria da Silva', app(CertificadoService::class)->html($primeiro->refresh()));
        });
    }

    public function test_fundo_ou_texto_de_outro_orgao_e_recusado(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $fundoAlheio = $this->noTenant($outro, fn () => Fundo::create(['nome' => 'B', 'imagem_path' => 'x.jpg']))->id;
        $textoAlheio = $this->noTenant($outro, fn () => TextoCertificado::create(['nome' => 'B', 'texto_principal' => 'x']))->id;

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $fundoAlheio, 'texto_id' => $this->texto, 'elementos' => $this->elementos(),
        ]), 'Fundo de certificado inexistente');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $textoAlheio, 'elementos' => $this->elementos(),
        ]), 'Modelo de texto inexistente');
    }

    public function test_fundo_inativo_nao_entra_em_leiaute_novo(): void
    {
        $this->noTenant($this->tenant, fn () => Fundo::query()->findOrFail($this->fundo)->update(['ativo' => false]));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos(),
        ]), 'inativo');
    }

    public function test_leiaute_sem_qr_e_recusado(): void
    {
        $semQr = array_values(array_filter($this->elementos(), fn (array $e): bool => $e['tipo'] !== 'qrcode'));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $semQr,
        ]), 'QR code');
    }

    public function test_pre_visualizacao_gera_pdf_sem_gravar(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/leiaute/pre-visualizar", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos(),
        ])->assertOk()->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', (string) $resposta->getContent());
        $this->noTenant($this->tenant, function (): void {
            $this->assertSame(0, ModeloCertificado::query()->count());
            $this->assertSame(0, Certificado::query()->count());
        });
    }

    public function test_participante_nao_usa_o_construtor(): void
    {
        $participante = $this->usuario($this->tenant, ['participante_cursos']);

        $this->como($participante, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}/leiaute", [
            'fundo_id' => $this->fundo, 'texto_id' => $this->texto, 'elementos' => $this->elementos(),
        ])->assertForbidden();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Cursos\Enums\TipoCertificado;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\LeiauteCertificado;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/** Snapshot do leiaute e PDF do certificado visual (change cursos-construtor-visual-certificado, 4.3). */
final class CertificadoVisualPdfTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    /** @param list<string> $verso */
    private function emitir(ModeloCertificado $modelo, array $verso = []): Certificado
    {
        $participante = Participante::create(['nome' => 'Maria da Silva', 'email' => 'maria' . uniqid() . '@x.gov']);

        return app(CertificadoService::class)->emitir($modelo, $participante, TipoCertificado::Curso, [
            'curso' => 'Gestão Pública', 'carga_horaria_minutos' => 1200,
            'inicio' => Carbon::parse('2026-09-01'), 'fim' => Carbon::parse('2026-09-30'), 'verso_linhas' => $verso,
        ], []);
    }

    public function test_modelo_padrao_continua_no_leiaute_fixo(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $modelo = ModeloCertificado::create(['nome' => 'Padrão', 'titulo' => 'Certificado', 'corpo' => 'Certificamos que {{participante}} concluiu {{curso}}.']);
            $certificado = $this->emitir($modelo);
            $html = app(CertificadoService::class)->html($certificado);

            $this->assertArrayNotHasKey('leiaute', $certificado->dados);
            $this->assertStringContainsString('class="moldura"', $html);
            $this->assertStringContainsString('Certificamos que Maria da Silva concluiu Gestão Pública.', $html);
            $this->assertStringNotContainsString('Conteúdo programático', $html);
        });
    }

    public function test_visual_imprime_cada_elemento_na_posicao_definida(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $elementos = [...LeiauteCertificado::padrao(), ['id' => 'nome', 'tipo' => 'texto', 'campo' => 'participante', 'x' => 100, 'y' => 250, 'largura' => 642, 'tamanho' => 28, 'caixa_alta' => true, 'alinhamento' => 'centro']];
            $modelo = ModeloCertificado::create(['nome' => 'Visual', 'tipo' => 'visual', 'titulo' => 'Certificado', 'corpo' => 'x', 'elementos' => LeiauteCertificado::validar($elementos, 'paisagem')]);
            $certificado = $this->emitir($modelo);
            $html = app(CertificadoService::class)->html($certificado);

            $this->assertMatchesRegularExpression('/left: 100pt; top: 250pt; width: 642pt;[^"]*font-size: 28pt;[^"]*text-align: center; text-transform: uppercase;"/', $html);
            $this->assertStringContainsString('Maria da Silva', $html);
            $this->assertStringContainsString($certificado->codigoFormatado(), $html);
            $this->assertStringContainsString('QR code de validação', $html);
        });
    }

    public function test_alterar_modelo_e_assinatura_depois_nao_muda_o_emitido(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $assinatura = Assinatura::create(['nome' => 'Ana Diretora', 'cargo' => 'Diretora', 'registro_profissional' => 'Mat. 10']);
            $elementos = [...LeiauteCertificado::padrao(), ['id' => 'a', 'tipo' => 'assinatura', 'assinatura_id' => $assinatura->id, 'x' => 300, 'y' => 420, 'largura' => 160]];
            $modelo = ModeloCertificado::create(['nome' => 'Visual', 'tipo' => 'visual', 'titulo' => 'Certificado', 'corpo' => 'x', 'elementos' => LeiauteCertificado::validar($elementos, 'paisagem')]);
            $certificado = $this->emitir($modelo);

            $assinatura->update(['nome' => 'Outra Pessoa', 'cargo' => 'Secretária']);
            $modelo->update(['elementos' => LeiauteCertificado::padrao(), 'titulo' => 'Novo título']);

            $html = app(CertificadoService::class)->html($certificado->fresh());
            $this->assertStringContainsString('Ana Diretora', $html);
            $this->assertStringContainsString('Diretora — Mat. 10', $html);
            $this->assertStringNotContainsString('Outra Pessoa', $html);
            $this->assertStringContainsString('left: 300pt; top: 420pt', $html);
        });
    }

    public function test_verso_so_aparece_com_conteudo(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $modelo = ModeloCertificado::create(['nome' => 'Com verso', 'titulo' => 'Certificado', 'corpo' => 'x', 'verso_ativo' => true]);

            $semConteudo = app(CertificadoService::class)->html($this->emitir($modelo, []));
            $comConteudo = app(CertificadoService::class)->html($this->emitir($modelo, ['Módulo 1 — Introdução', 'Módulo 2 — Prática']));

            $this->assertStringNotContainsString('Conteúdo programático', $semConteudo);
            $this->assertStringContainsString('Conteúdo programático', $comConteudo);
            $this->assertStringContainsString('Módulo 2 — Prática', $comConteudo);
        });
    }
}

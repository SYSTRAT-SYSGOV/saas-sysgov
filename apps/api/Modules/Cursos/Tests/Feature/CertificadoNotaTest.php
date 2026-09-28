<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\FormacaoService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 5.4 — o campo dinâmico {{nota}} nos modelos de certificado.
 */
final class CertificadoNotaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    private function modeloComNota(): ModeloCertificado
    {
        return $this->noTenant($this->tenant, fn () => ModeloCertificado::create([
            'nome' => 'Com nota', 'titulo' => 'Certificado',
            'corpo' => 'Certificamos que {{participante}} concluiu {{curso}} com nota {{nota}}.', 'padrao' => true,
        ]));
    }

    private function concluirTurma(): void
    {
        $this->registrarPresencas($this->inscricao, $this->agendarAulasRealizadas(4), 4);
        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);
    }

    private function certificadoDoCurso(): Certificado
    {
        return $this->noTenant($this->tenant, fn () => Certificado::query()->where('tipo', 'curso')->firstOrFail());
    }

    public function test_nota_impressa_no_certificado_de_curso_com_nota_minima(): void
    {
        $this->prepararCenarioAvaliacao(curso: ['nota_minima' => 7, 'titulo' => 'Contratos']);
        $this->modeloComNota();
        $a = $this->avaliacaoDireta(peso: 1, titulo: 'A');
        $b = $this->avaliacaoDireta(peso: 3, titulo: 'B');
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 6.0, numero: 1);
        $this->tentativaDireta($a, $this->inscricao, 'corrigida', 8.0, numero: 2);
        $this->tentativaDireta($b, $this->inscricao, 'corrigida', 9.0);

        $this->concluirTurma();

        $certificado = $this->certificadoDoCurso();
        $this->assertSame('Certificamos que Aluno concluiu Contratos com nota 8,75.', $certificado->dados['corpo']);
        $this->assertSame('8,75', $certificado->dados['nota']);
    }

    public function test_curso_sem_nota_minima_imprime_travessao(): void
    {
        $this->prepararCenarioAvaliacao(curso: ['titulo' => 'Contratos']);
        $this->modeloComNota();
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 9.0);

        $this->concluirTurma();

        $certificado = $this->certificadoDoCurso();
        $this->assertSame('Certificamos que Aluno concluiu Contratos com nota —.', $certificado->dados['corpo']);
        $this->assertSame('—', $certificado->dados['nota']);
    }

    public function test_certificado_emitido_depois_pelo_botao_de_pendentes_tambem_imprime_a_nota(): void
    {
        $this->prepararCenarioAvaliacao(curso: ['nota_minima' => 7, 'titulo' => 'Contratos']);
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 9.5);
        $this->concluirTurma();
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Certificado::count()), 'sem modelo, a emissão fica pendente');

        $this->modeloComNota();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$this->turma->id}/certificados/emitir-pendentes")->assertOk();

        $this->assertSame('9,50', $this->certificadoDoCurso()->dados['nota']);
    }

    public function test_certificado_de_formacao_imprime_travessao(): void
    {
        $this->prepararCenarioAvaliacao(curso: ['nota_minima' => 7, 'titulo' => 'Contratos']);
        $this->modeloComNota();
        $formacao = $this->noTenant($this->tenant, fn () => app(FormacaoService::class)->criar(['titulo' => 'Trilha'], [['curso_id' => $this->curso->id, 'obrigatorio' => true]]));
        $this->tentativaDireta($this->avaliacaoDireta(), $this->inscricao, 'corrigida', 9.0);

        $this->concluirTurma();

        $deFormacao = $this->noTenant($this->tenant, fn () => Certificado::query()->where('formacao_id', $formacao->id)->firstOrFail());
        $this->assertSame('Certificamos que Aluno concluiu Trilha com nota —.', $deFormacao->dados['corpo']);
        $this->assertSame('9,00', $this->certificadoDoCurso()->dados['nota']);
    }

    public function test_modelo_aceita_o_campo_nota_e_continua_recusando_os_desconhecidos(): void
    {
        $this->prepararCenarioAvaliacao();

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', ['nome' => 'A', 'titulo' => 'T', 'corpo' => 'Nota: {{nota}}'])->assertCreated();
        $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', ['nome' => 'B', 'titulo' => 'T', 'corpo' => '{{nota}} e {{cpf_completo}}']);

        $this->assertErroDeNegocio($resposta, 'cpf_completo');
        $this->assertStringContainsString('{{nota}}', (string) $resposta->json('error'), 'a lista de campos válidos inclui {{nota}}');
    }

    public function test_certificado_antigo_sem_a_chave_nota_continua_abrindo_o_pdf(): void
    {
        $this->prepararCenarioAvaliacao();
        $this->modeloComNota();
        $this->concluirTurma();
        $certificado = $this->certificadoDoCurso();
        $dados = $certificado->dados;
        unset($dados['nota']);
        $this->noTenant($this->tenant, fn () => Certificado::query()->whereKey($certificado->id)->update(['dados' => json_encode($dados)]));

        $pdf = $this->como($this->aluno, $this->tenant)->get("/api/cursos/certificados/{$certificado->id}/pdf")->assertOk();

        $this->assertStringStartsWith('%PDF', (string) $pdf->getContent());
    }

    public function test_formatacao_da_nota(): void
    {
        $this->assertSame('8,75', CertificadoService::formatarNota('8.75'));
        $this->assertSame('10,00', CertificadoService::formatarNota(10.0));
        $this->assertSame('0,00', CertificadoService::formatarNota('0.00'));
        $this->assertSame('—', CertificadoService::formatarNota(null));
    }
}

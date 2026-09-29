<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Relatórios do Cursos, tarefa 2.2 — relatório de cursos por período.
 */
final class RelatorioCursosTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
    }

    /** @param array<string, mixed> $atributos */
    private function turma(Curso $curso, array $atributos = []): Turma
    {
        return $this->turmaAberta($this->tenant, $curso, $this->instrutor, $atributos);
    }

    /**
     * Encerra a turma direto no banco com os resultados dados, sem passar pela fila completa de
     * encerramento (o serviço em si já é testado na Fase 2) — só a leitura pelo relatório.
     *
     * @param list<array{status: string, frequencia: float, nota?: float|null}> $resultados
     */
    private function encerrarComResultados(Turma $turma, array $resultados): void
    {
        foreach ($resultados as $i => $r) {
            $participante = $this->usuario($this->tenant, ['participante_cursos'], "P{$turma->id}-{$i}");
            $inscricao = $this->inscrever($this->tenant, $turma, $participante);
            $this->noTenant($this->tenant, fn () => Inscricao::query()->whereKey($inscricao->id)->update([
                'status' => $r['status'], 'frequencia_apurada' => $r['frequencia'], 'nota_apurada' => $r['nota'] ?? null, 'concluida_em' => now(),
            ]));
        }
        $this->noTenant($this->tenant, fn () => Turma::query()->whereKey($turma->id)->update(['status' => 'encerrada']));
    }

    /**
     * @param array<string, mixed> $filtros
     * @return array<string, mixed>
     */
    private function relatorio(array $filtros): array
    {
        return $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/relatorios/cursos?' . http_build_query($filtros))
            ->assertOk()
            ->json();
    }

    public function test_cursos_do_periodo(): void
    {
        $cursoA = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso A']);
        $cursoB = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso B']);
        $turmaA = $this->turma($cursoA, ['nome' => 'A1', 'data_inicio' => '2025-03-10', 'data_fim' => '2025-03-20']);
        $turmaB = $this->turma($cursoB, ['nome' => 'B1', 'data_inicio' => '2025-06-01', 'data_fim' => '2025-06-05']);
        $this->encerrarComResultados($turmaA, [
            ['status' => 'concluida', 'frequencia' => 100.0, 'nota' => 8.0],
            ['status' => 'nao_concluida', 'frequencia' => 40.0],
        ]);
        $this->encerrarComResultados($turmaB, [['status' => 'concluida', 'frequencia' => 90.0]]);

        $relatorio = $this->relatorio(['inicio' => '2025-01-01', 'fim' => '2025-12-31']);

        $this->assertCount(2, $relatorio['cursos']);
        /** @var array<int, array<string, mixed>> $cursos */
        $cursos = $relatorio['cursos'];
        $porTitulo = collect($cursos)->keyBy('titulo');
        $this->assertSame(1, $porTitulo['Curso A']['turmas']);
        $this->assertSame(2, $porTitulo['Curso A']['inscricoes']);
        $this->assertSame(1, $porTitulo['Curso A']['concluidos']);
        $this->assertSame(1, $porTitulo['Curso B']['concluidos']);
        $this->assertSame(3, $relatorio['totais']['inscricoes']);
        $this->assertSame(2, $relatorio['totais']['concluidos']);
    }

    public function test_filtro_por_tipo(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['tipo' => 'curso', 'titulo' => 'Curso comum']);
        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento', 'titulo' => 'Palestra', 'carga_horaria_minutos' => 120]);
        $this->turma($curso, ['data_inicio' => '2025-05-01', 'data_fim' => '2025-05-02']);
        $this->turma($evento, ['nome' => 'Edição única', 'data_inicio' => '2025-05-10', 'data_fim' => '2025-05-10']);

        $relatorio = $this->relatorio(['inicio' => '2025-01-01', 'fim' => '2025-12-31', 'tipo' => 'evento']);

        $this->assertCount(1, $relatorio['cursos']);
        $this->assertSame('Palestra', $relatorio['cursos'][0]['titulo']);
        $this->assertSame('evento', $relatorio['cursos'][0]['tipo']);
    }

    public function test_periodo_sem_turmas(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $this->turma($curso, ['data_inicio' => '2025-05-01', 'data_fim' => '2025-05-02']);

        $relatorio = $this->relatorio(['inicio' => '2020-01-01', 'fim' => '2020-12-31']);

        $this->assertSame([], $relatorio['cursos']);
        $this->assertSame(0, $relatorio['totais']['turmas']);
        $this->assertSame(0, $relatorio['totais']['inscricoes']);
        $this->assertNull($relatorio['totais']['taxa_conclusao']);
    }

    public function test_turma_aberta_no_periodo(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso misto']);
        $turmaEncerrada = $this->turma($curso, ['nome' => 'Encerrada', 'data_inicio' => '2025-02-01', 'data_fim' => '2025-02-05']);
        $this->encerrarComResultados($turmaEncerrada, [
            ['status' => 'concluida', 'frequencia' => 100.0],
        ]);
        $turmaAberta = $this->turma($curso, ['nome' => 'Aberta', 'data_inicio' => '2025-02-10', 'data_fim' => '2025-02-15']);
        $this->inscrever($this->tenant, $turmaAberta, $this->usuario($this->tenant, ['participante_cursos'], 'Confirmado'));

        $relatorio = $this->relatorio(['inicio' => '2025-01-01', 'fim' => '2025-12-31']);
        $cursoSaida = $relatorio['cursos'][0];

        // As duas turmas entram na contagem, mas só a encerrada entra na taxa e na média.
        $this->assertSame(2, $cursoSaida['turmas']);
        $this->assertSame(2, $cursoSaida['inscricoes']);
        $this->assertEquals(100.0, $cursoSaida['taxa_conclusao']);
        $this->assertEquals(100.0, $cursoSaida['frequencia_media']);

        /** @var array<int, array<string, mixed>> $turmasDetalhe */
        $turmasDetalhe = $cursoSaida['turmas_detalhe'];
        $porNome = collect($turmasDetalhe)->keyBy('turma_nome');
        $this->assertNull($porNome['Aberta']['taxa_conclusao']);
        $this->assertNull($porNome['Aberta']['frequencia_media']);
        $this->assertEquals(100.0, $porNome['Encerrada']['taxa_conclusao']);
    }

    public function test_instrutor_nao_acessa_o_relatorio_de_cursos(): void
    {
        $this->como($this->instrutor, $this->tenant)
            ->getJson('/api/cursos/relatorios/cursos?' . http_build_query(['inicio' => '2025-01-01', 'fim' => '2025-12-31']))
            ->assertForbidden();
    }

    public function test_exportacao_com_auditoria(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Exportável']);
        $turma = $this->turma($curso, ['nome' => 'Turma X', 'data_inicio' => '2025-05-01', 'data_fim' => '2025-05-05']);
        $this->encerrarComResultados($turma, [['status' => 'concluida', 'frequencia' => 100.0, 'nota' => 9.0]]);

        $resposta = $this->como($this->admin, $this->tenant)
            ->get('/api/cursos/relatorios/cursos/exportar?' . http_build_query(['inicio' => '2025-01-01', 'fim' => '2025-12-31']))
            ->assertOk();
        $csv = $resposta->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $linhas = array_values(array_filter(explode("\n", trim(substr($csv, 3)))));
        $this->assertSame('Curso;Tipo;Turma;Status;Inscrições;Concluídos;"Não concluídos";"Taxa de conclusão (%)";"Frequência média (%)";"Nota média";"Certificados emitidos"', $linhas[0]);
        $this->assertCount(2, $linhas);
        $this->assertStringContainsString('Curso Exportável', $linhas[1]);
        $this->assertStringContainsString('Turma X', $linhas[1]);

        $log = AuditLog::where('action', 'relatorios.cursos.exportado')->first();
        $this->assertNotNull($log);
        $this->assertSame(1, $log->after['linhas']);
        $this->assertSame(['inicio' => '2025-01-01', 'fim' => '2025-12-31'], $log->after['filtros']);
    }

    public function test_participante_nao_acessa_o_relatorio_de_cursos(): void
    {
        $participante = $this->usuario($this->tenant, ['participante_cursos'], 'Participante');

        $this->como($participante, $this->tenant)
            ->getJson('/api/cursos/relatorios/cursos?' . http_build_query(['inicio' => '2025-01-01', 'fim' => '2025-12-31']))
            ->assertForbidden();
    }

    public function test_isolamento_entre_orgaos(): void
    {
        $cursoA = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso do Órgão A']);
        $this->turma($cursoA, ['nome' => 'A1', 'data_inicio' => '2025-04-01', 'data_fim' => '2025-04-05']);

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroInstrutor = $this->usuario($outroTenant, ['instrutor_cursos'], 'Instrutor B');
        $cursoB = $this->cursoPublicado($outroTenant, ['titulo' => 'Curso do Órgão B']);
        $this->turmaAberta($outroTenant, $cursoB, $outroInstrutor, ['nome' => 'B1', 'data_inicio' => '2025-04-01', 'data_fim' => '2025-04-05']);

        $relatorio = $this->relatorio(['inicio' => '2025-01-01', 'fim' => '2025-12-31']);
        /** @var array<int, array<string, mixed>> $cursos */
        $cursos = $relatorio['cursos'];
        $titulos = collect($cursos)->pluck('titulo')->all();

        $this->assertContains('Curso do Órgão A', $titulos);
        $this->assertNotContains('Curso do Órgão B', $titulos, 'relatório do órgão A não pode trazer curso do órgão B');
    }

    public function test_exportacao_respeita_filtros_e_isolamento(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['tipo' => 'curso', 'titulo' => 'Curso Comum']);
        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento', 'titulo' => 'Palestra']);
        $this->turma($curso, ['nome' => 'Turma Comum', 'data_inicio' => '2025-05-01', 'data_fim' => '2025-05-02']);
        $this->turma($evento, ['nome' => 'Turma Evento', 'data_inicio' => '2025-05-10', 'data_fim' => '2025-05-10']);

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroInstrutor = $this->usuario($outroTenant, ['instrutor_cursos'], 'Instrutor B');
        $cursoB = $this->cursoPublicado($outroTenant, ['tipo' => 'evento', 'titulo' => 'Curso do Órgão B']);
        $this->turmaAberta($outroTenant, $cursoB, $outroInstrutor, ['nome' => 'Turma B', 'data_inicio' => '2025-05-01', 'data_fim' => '2025-05-05']);

        $csv = $this->como($this->admin, $this->tenant)
            ->get('/api/cursos/relatorios/cursos/exportar?' . http_build_query(['inicio' => '2025-01-01', 'fim' => '2025-12-31', 'tipo' => 'evento']))
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('Palestra', $csv);
        $this->assertStringNotContainsString('Curso Comum', $csv, 'o filtro tipo=evento não pode trazer o curso do tipo "curso"');
        $this->assertStringNotContainsString('Curso do Órgão B', $csv, 'a exportação não pode trazer curso de outro órgão');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Models\Aluno;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\RelatorioService;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class RelatorioTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    public function test_gestor_gera_pdf_e_professor_ve_so_sua_materia(): void
    {
        Storage::fake('local');
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $professor = $this->usuario($tenant, ['portfolio_professor']);
        $turma = $this->turma($tenant);
        $mat = $this->materia($tenant, 'Matemática');
        $port = $this->materia($tenant, 'Português');
        $this->vincular($tenant, $turma, $mat, $professor);
        $this->vincular($tenant, $turma, $port);
        $aluno = $this->aluno($tenant, $turma, 'Ana Souza');
        foreach ([$mat, $port] as $m) {
            $id = $this->como($gestor, $tenant)->postJson("/api/portfolio/alunos/{$aluno->id}/trabalhos", ['titulo' => "Trabalho de {$m->nome}", 'materia_id' => $m->id, 'data' => '2026-06-10', 'avaliacao' => 8])->json('data.id');
            $this->como($gestor, $tenant)->post("/api/portfolio/trabalhos/{$id}/imagens", ['imagem' => UploadedFile::fake()->image('f.jpg', 2000, 1500)], ['Accept' => 'application/json'])->assertCreated();
        }

        $pdf = $this->como($gestor, $tenant)->get("/api/portfolio/alunos/{$aluno->id}/relatorio?ano=2026");
        // Fontes em subconjunto: sem isso as 4 DejaVu inteiras deixam o PDF com mais de 1 MB.
        $this->assertLessThan(300_000, strlen((string) $pdf->getContent()));
        $pdf->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'attachment; filename=Portfolio_ana-souza_2026.pdf');
        $this->assertTrue(AuditLog::query()->where('action', 'relatorio.gerado')->exists());

        // Conteúdo restrito: dados montados para o professor
        $dados = $this->noTenant($tenant, function () use ($aluno, $professor): array {
            $trabalhos = app(\Modules\Portfolio\Services\EscopoPortfolio::class)->restringir(Trabalho::query(), $professor)->where('aluno_id', $aluno->id)->with(['materia', 'imagens'])->get();
            $servico = app(RelatorioService::class);

            return $servico->dados(Aluno::findOrFail($aluno->id), $trabalhos, app(\Modules\Portfolio\Services\DesempenhoService::class)->calcular($trabalhos, true), 2026, null, $professor);
        });
        $this->assertSame(['Trabalho de Matemática'], array_column($dados['trabalhos'], 'titulo'));
        $this->assertStringStartsWith('data:image/jpeg;base64,', $dados['trabalhos'][0]['imagens'][0]);
    }

    public function test_acima_do_limite_mantem_duas_imagens_por_trabalho(): void
    {
        $servico = app(RelatorioService::class);
        // 31 trabalhos × 2 imagens = 62 > 60 → cada trabalho fica com até 2
        $this->assertSame([2, 0], $servico->cotaPorTrabalho(2, 62));
        // 3 imagens num trabalho e total acima do limite → 2 mostradas, 1 omitida
        $this->assertSame([2, 1], $servico->cotaPorTrabalho(3, 61));
        // dentro do limite → todas
        $this->assertSame([5, 0], $servico->cotaPorTrabalho(5, 40));
    }

    public function test_professor_nao_gera_de_aluno_alheio(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->aluno($tenant, $this->turma($tenant), 'Ana');
        $this->como($this->usuario($tenant, ['portfolio_professor']), $tenant)->getJson("/api/portfolio/alunos/{$aluno->id}/relatorio?ano=2026")
            ->assertNotFound();
    }

    public function test_pdf_de_ano_anterior_mostra_a_turma_daquele_ano(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $turma2025 = $this->turma($tenant, '5º A', 2025);
        $turma2026 = $this->turma($tenant, '6º A', 2026);
        $materia = $this->materia($tenant);
        $this->vincular($tenant, $turma2025, $materia);
        $aluno = $this->aluno($tenant, $turma2025, 'Ana');
        $this->como($gestor, $tenant)->postJson("/api/portfolio/alunos/{$aluno->id}/trabalhos", ['titulo' => 'De 2025', 'materia_id' => $materia->id, 'data' => '2025-05-10', 'avaliacao' => 9])->assertCreated();
        $this->noTenant($tenant, fn () => $aluno->update(['turma_id' => $turma2026->id]));

        $dados = $this->noTenant($tenant, function () use ($aluno, $gestor): array {
            $trabalhos = Trabalho::query()->where('aluno_id', $aluno->id)->where('ano_letivo', 2025)->with(['materia', 'imagens', 'turma'])->get();

            return app(RelatorioService::class)->dados(Aluno::findOrFail($aluno->id), $trabalhos, app(\Modules\Portfolio\Services\DesempenhoService::class)->calcular($trabalhos, true), 2025, null, $gestor);
        });
        $this->assertSame('5º A', $dados['turma']);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Portfolio\Models\Imagem;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class ImagemTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    private Tenant $tenant;
    private User $gestor;
    private User $professor;
    private int $trabalhoId;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->gestor = $this->usuario($this->tenant);
        $this->professor = $this->usuario($this->tenant, ['portfolio_professor']);
        $turma = $this->turma($this->tenant);
        $materia = $this->materia($this->tenant);
        $this->vincular($this->tenant, $turma, $materia);
        $aluno = $this->aluno($this->tenant, $turma, 'Ana');
        $this->trabalhoId = (int) $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$aluno->id}/trabalhos", [
            'titulo' => 'Cartaz', 'materia_id' => $materia->id, 'data' => '2026-06-10', 'avaliacao' => 9,
        ])->assertCreated()->json('data.id');
    }

    /** @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> */
    private function enviar(UploadedFile $arquivo): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->gestor, $this->tenant)->post("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens", ['imagem' => $arquivo], ['Accept' => 'application/json']);
    }

    public function test_reduz_para_jpeg_de_1600_px_e_serve_autenticado(): void
    {
        $id = $this->enviar(UploadedFile::fake()->image('foto.png', 4000, 3000))->assertCreated()->json('data.id');

        $imagem = $this->noTenant($this->tenant, fn () => Imagem::findOrFail($id));
        $this->assertStringStartsWith("portfolio/{$this->tenant->id}/trabalhos/{$this->trabalhoId}/", $imagem->path);
        $this->assertSame('image/jpeg', $imagem->mime);
        [$largura, $altura] = getimagesizefromstring(Storage::disk('local')->get($imagem->path)) ?: [0, 0];
        $this->assertSame([1600, 1200], [$largura, $altura]);

        $this->como($this->gestor, $this->tenant)->get("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens/{$id}")
            ->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_setima_imagem_e_arquivo_que_nao_e_imagem_sao_recusados(): void
    {
        foreach (range(1, 6) as $i) {
            $this->enviar(UploadedFile::fake()->image("f{$i}.jpg", 50, 50))->assertCreated();
        }
        $this->enviar(UploadedFile::fake()->image('f7.jpg', 50, 50))->assertStatus(422)->assertJsonValidationErrors('imagem');
        $this->enviar(UploadedFile::fake()->create('redacao.pdf', 100, 'application/pdf'))->assertStatus(422)->assertJsonValidationErrors('imagem');
    }

    public function test_professor_de_outra_turma_nao_ve_a_imagem(): void
    {
        $id = $this->enviar(UploadedFile::fake()->image('foto.jpg', 100, 100))->assertCreated()->json('data.id');
        $this->como($this->professor, $this->tenant)->get("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens/{$id}", ['Accept' => 'application/json'])
            ->assertNotFound();
    }

    public function test_imagem_de_outro_trabalho_pela_url_errada_e_404(): void
    {
        // Dois trabalhos visíveis do mesmo aluno: a imagem do segundo não pode sair pela URL do primeiro.
        $alunoId = $this->noTenant($this->tenant, fn () => \Modules\Portfolio\Models\Trabalho::findOrFail($this->trabalhoId)->aluno_id);
        $materiaId = $this->noTenant($this->tenant, fn () => \Modules\Portfolio\Models\Trabalho::findOrFail($this->trabalhoId)->materia_id);
        $outro = (int) $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$alunoId}/trabalhos", [
            'titulo' => 'Outro', 'materia_id' => $materiaId, 'data' => '2026-06-11', 'avaliacao' => 7,
        ])->assertCreated()->json('data.id');
        $id = $this->como($this->gestor, $this->tenant)->post("/api/portfolio/trabalhos/{$outro}/imagens", ['imagem' => UploadedFile::fake()->image('f.jpg', 100, 100)], ['Accept' => 'application/json'])
            ->assertCreated()->json('data.id');
        $caminho = $this->noTenant($this->tenant, fn () => Imagem::findOrFail($id)->path);

        $this->como($this->gestor, $this->tenant)->get("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens/{$id}", ['Accept' => 'application/json'])->assertNotFound();
        $this->como($this->gestor, $this->tenant)->deleteJson("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens/{$id}")->assertNotFound();
        Storage::disk('local')->assertExists($caminho);
    }

    public function test_imagem_com_pixels_demais_e_recusada_com_422(): void
    {
        // PNG liso: poucos bytes, mas 42 megapixels — decodificar estouraria a memória do PHP.
        $this->enviar(UploadedFile::fake()->image('enorme.png', 7000, 6000))
            ->assertStatus(422)->assertJsonValidationErrors('imagem');
    }

    public function test_excluir_imagem_e_trabalho_remove_arquivos(): void
    {
        $ids = collect(range(1, 3))->map(fn () => $this->enviar(UploadedFile::fake()->image('f.jpg', 80, 80))->json('data.id'));
        $caminhos = $this->noTenant($this->tenant, fn () => Imagem::whereIn('id', $ids)->pluck('path'));

        $this->como($this->gestor, $this->tenant)->deleteJson("/api/portfolio/trabalhos/{$this->trabalhoId}/imagens/{$ids[0]}")->assertOk();
        Storage::disk('local')->assertMissing($caminhos[0]);

        $this->como($this->gestor, $this->tenant)->deleteJson("/api/portfolio/trabalhos/{$this->trabalhoId}")->assertOk();
        Storage::disk('local')->assertMissing($caminhos[1]);
        Storage::disk('local')->assertMissing($caminhos[2]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Tarefas 2.6 e 2.7 — importação de alunos, matérias, vínculos e CSV de matérias. */
final class ImportacaoMateriaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private function csv(string $conteudo): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('arquivo.csv', $conteudo);
    }

    public function test_importa_com_bom_e_virgula_e_rejeita_turma_inexistente(): void
    {
        $tenant = $this->criarTenant();
        $this->turma($tenant, '6º A');
        $conteudo = "\u{FEFF}nome,cgm,turma,numero,nascimento,contato\n"
            . "Ana Paula,111,6º A,3,05/03/2014,41999990000\n"
            . "Bruno Lima,222,5º Z,,,\n"
            . "Carla Dias,333,6º a,,2014-07-10,\n";

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/alunos/importar', ['arquivo' => $this->csv($conteudo)])
            ->assertOk()
            ->assertJsonPath('criados', 2)
            ->assertJsonPath('atualizados', 0)
            ->assertJsonPath('rejeitadas.0.linha', 3);

        $this->noTenant($tenant, function (): void {
            $ana = Aluno::where('cgm', '111')->with('contatos')->firstOrFail();
            $this->assertSame('ANA PAULA', $ana->nome);
            $this->assertSame(3, $ana->numero);
            $this->assertSame('2014-03-05', $ana->nascimento?->toDateString());
            $this->assertSame('41999990000', $ana->contatos->first()?->telefone);
        });
    }

    public function test_reimportar_o_mesmo_arquivo_so_atualiza(): void
    {
        $tenant = $this->criarTenant();
        $this->turma($tenant, '6º A');
        $conteudo = "NOME;TURMA\nAna Paula;6º A\nBruno Lima;6º A\n";
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->postJson('/api/escola/alunos/importar', ['arquivo' => $this->csv($conteudo)])->assertJsonPath('criados', 2);
        $this->como($direcao, $tenant)->postJson('/api/escola/alunos/importar', ['arquivo' => $this->csv($conteudo)])
            ->assertJsonPath('criados', 0)->assertJsonPath('atualizados', 2);
        $this->assertSame(2, $this->noTenant($tenant, fn () => Aluno::count()));
    }

    public function test_csv_sem_cabecalho_obrigatorio_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/alunos/importar', ['arquivo' => $this->csv("NOME;CGM\nAna;1\n")])
            ->assertStatus(422)->assertJsonPath('error', 'Cabeçalho obrigatório ausente: TURMA.');
    }

    public function test_materia_duplicada_sem_diferenciar_acento_e_maiusculas(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->postJson('/api/escola/materias', ['nome' => 'Matemática'])->assertCreated();
        $this->como($direcao, $tenant)->postJson('/api/escola/materias', ['nome' => 'matematica'])
            ->assertStatus(422)->assertJsonValidationErrors('nome');
    }

    public function test_vinculo_com_professor_e_turmas_por_materia(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $turma = $this->turma($tenantA, '6º A');
        $materia = $this->noTenant($tenantA, fn () => Materia::create(['nome' => 'Arte']));
        $direcao = $this->usuario($tenantA);
        $professor = $this->usuario($tenantA, [], 'Prof Arte');
        $deOutroTenant = $this->usuario($tenantB, [], 'Prof B');

        $this->como($direcao, $tenantA)->putJson("/api/escola/turmas/{$turma->id}/materias", [
            'vinculos' => [['materia_id' => $materia->id, 'professor_user_id' => $deOutroTenant->id]],
        ])->assertStatus(422)->assertJsonValidationErrors('vinculos.0.professor_user_id');

        $this->como($direcao, $tenantA)->putJson("/api/escola/turmas/{$turma->id}/materias", [
            'vinculos' => [['materia_id' => $materia->id, 'professor_user_id' => $professor->id]],
        ])->assertOk()->assertJsonPath('materias.0.professor', 'Prof Arte');

        $this->como($direcao, $tenantA)->getJson('/api/escola/materias')
            ->assertOk()->assertJsonPath('0.turmas.0.nome', '6º A');
    }

    public function test_excluir_materia_remove_vinculos(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $materia = $this->noTenant($tenant, function () use ($turma): Materia {
            $m = Materia::create(['nome' => 'Química']);
            TurmaMateria::create(['turma_id' => $turma->id, 'materia_id' => $m->id]);

            return $m;
        });

        $this->como($this->usuario($tenant), $tenant)->deleteJson("/api/escola/materias/{$materia->id}")->assertOk();
        $this->assertSame(0, $this->noTenant($tenant, fn () => TurmaMateria::count()));
    }

    public function test_reimportar_o_csv_exportado_nao_cria_materia_com_o_id(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $this->noTenant($tenant, function (): void {
            Materia::create(['nome' => 'Biologia']);
            Materia::create(['nome' => 'Física']);
        });

        $exportado = $this->como($direcao, $tenant)->get('/api/escola/materias/exportar')->assertOk();
        $this->assertStringStartsWith("\u{FEFF}ID;Nome", $exportado->getContent());

        $this->como($direcao, $tenant)->postJson('/api/escola/materias/importar', ['arquivo' => $this->csv($exportado->getContent())])
            ->assertOk()->assertJsonPath('importadas', 0)->assertJsonPath('ignoradas', 2);
        $this->assertSame(2, $this->noTenant($tenant, fn () => Materia::count()));
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\AlunoContato;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Models\Turno;
use Modules\Escola\Models\Unidade;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/**
 * Teste de isolamento obrigatório (contrato de módulo SYSGOV): o mesmo cenário nos tenants A e B
 * nunca cruza dados, para todos os models do módulo; e via HTTP, id de outro tenant vira 404.
 */
final class TenantIsolationTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    /** @var list<class-string<Model>> */
    private const MODELS = [
        Unidade::class, Turno::class, Turma::class, Aluno::class, AlunoContato::class,
        Materia::class, TurmaMateria::class, Trimestre::class, CategoriaOcorrencia::class, MembroEquipe::class,
    ];

    public function test_todos_os_models_sao_isolados_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('escola-a', comModulo: false);
        $tenantB = $this->criarTenant('escola-b', comModulo: false);

        $idsA = $this->noTenant($tenantA, fn (): array => $this->montarCenario('A'));
        $this->noTenant($tenantB, fn (): array => $this->montarCenario('B'));

        foreach (self::MODELS as $model) {
            $this->noTenant($tenantB, function () use ($model, $idsA, $tenantB): void {
                $this->assertSame(1, $model::count(), "{$model}: o tenant B deveria ver só o próprio registro.");
                $this->assertNull($model::find($idsA[$model]), "{$model}: o tenant B não pode achar o registro do A pelo id.");
                $this->assertSame($tenantB->id, $model::firstOrFail()->getAttribute('tenant_id'));
            });
        }
    }

    public function test_nao_cria_registro_sem_tenant(): void
    {
        $this->expectException(LogicException::class);
        Materia::create(['nome' => 'Sem tenant']);
    }

    public function test_aluno_de_outro_tenant_responde_404(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $alunoB = $this->aluno($tenantB, $this->turma($tenantB), 'ALUNO DO B');

        $this->como($this->usuario($tenantA), $tenantA)->getJson("/api/escola/alunos/{$alunoB->id}")->assertNotFound();
    }

    public function test_tenant_id_no_corpo_e_ignorado(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $turnoA = $this->turno($tenantA);

        $this->como($this->usuario($tenantA), $tenantA)
            ->postJson('/api/escola/turmas', ['nome' => '6º A', 'turno_id' => $turnoA->id, 'ano_letivo' => 2026, 'tenant_id' => $tenantB->id])
            ->assertCreated();

        $this->assertDatabaseHas('escola_turmas', ['nome' => '6º A', 'tenant_id' => $tenantA->id]);
        $this->assertDatabaseMissing('escola_turmas', ['tenant_id' => $tenantB->id]);
    }

    /** @return array<class-string<Model>, int> */
    private function montarCenario(string $sufixo): array
    {
        $unidade = Unidade::create(['nome' => "Escola {$sufixo}"]);
        $turno = Turno::create(['nome' => "Manhã {$sufixo}", 'ordem' => 1]);
        $turma = Turma::create(['nome' => "6º {$sufixo}", 'turno_id' => $turno->id, 'ano_letivo' => 2026]);
        $aluno = Aluno::create(['nome' => "Aluno {$sufixo}", 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        $contato = AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => '41999990000']);
        $materia = Materia::create(['nome' => "Matemática {$sufixo}"]);
        $vinculo = TurmaMateria::create(['turma_id' => $turma->id, 'materia_id' => $materia->id]);
        $trimestre = Trimestre::create(['ano_letivo' => 2026, 'numero' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-05-01']);
        $categoria = CategoriaOcorrencia::create(['nome' => "Falta {$sufixo}", 'cor' => '#ffffff']);
        $membro = MembroEquipe::create(['nome' => "Diretor {$sufixo}", 'cargo' => 'diretor']);

        return [
            Unidade::class => $unidade->id, Turno::class => $turno->id, Turma::class => $turma->id,
            Aluno::class => $aluno->id, AlunoContato::class => $contato->id, Materia::class => $materia->id,
            TurmaMateria::class => $vinculo->id, Trimestre::class => $trimestre->id, CategoriaOcorrencia::class => $categoria->id,
            MembroEquipe::class => $membro->id,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Códigos Inep opcionais do aluno e da turma, para o Censo (change transporte-fase-4-censo-e-painel, D30). */
final class CodigoInepTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private Escola $escola;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant);
        $this->escola = $this->escola($this->tenant, 'Escola A');
        $this->turma = $this->naEscola($this->tenant, $this->escola, fn (): Turma => Turma::create(['nome' => '6º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
    }

    private int $sequencia = 0;

    /** CPF válido, diferente a cada chamada. */
    private function cpf(): string
    {
        $d = array_map('intval', str_split(str_pad((string) (123456000 + ++$this->sequencia), 9, '0', STR_PAD_LEFT)));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($d as $i => $v) {
                $soma += $v * ($peso - $i);
            }
            $resto = ($soma * 10) % 11;
            $d[] = $resto === 10 ? 0 : $resto;
        }

        return implode('', $d);
    }

    private function http(): static
    {
        return $this->como($this->admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escola->id);
    }

    public function test_aluno_guarda_e_devolve_o_codigo_inep(): void
    {
        $id = $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Ana Lima', 'turma_id' => $this->turma->id, 'inep_id' => ' 123456789012 '])
            ->assertCreated()->assertJsonPath('inep_id', '123456789012')->json('id');

        $this->http()->putJson("/api/escola/alunos/{$id}", ['inep_id' => '999'])->assertOk()->assertJsonPath('inep_id', '999');
        $this->http()->getJson("/api/escola/alunos/{$id}")->assertJsonPath('inep_id', '999');
    }

    public function test_codigo_inep_do_aluno_e_opcional_e_varios_alunos_podem_ficar_sem(): void
    {
        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Ana', 'turma_id' => $this->turma->id])->assertCreated()->assertJsonPath('inep_id', null);
        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Beto', 'turma_id' => $this->turma->id, 'inep_id' => ''])->assertCreated()->assertJsonPath('inep_id', null);
        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Caio', 'turma_id' => $this->turma->id, 'inep_id' => '   '])->assertCreated()->assertJsonPath('inep_id', null);
    }

    public function test_codigo_inep_do_aluno_e_unico_no_tenant(): void
    {
        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Ana', 'turma_id' => $this->turma->id, 'inep_id' => '777'])->assertCreated();
        $outro = $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Beto', 'turma_id' => $this->turma->id])->assertCreated()->json('id');

        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Caio', 'turma_id' => $this->turma->id, 'inep_id' => '777'])->assertUnprocessable()->assertJsonValidationErrors(['inep_id']);
        $this->http()->putJson("/api/escola/alunos/{$outro}", ['inep_id' => '777'])->assertUnprocessable()->assertJsonValidationErrors(['inep_id']);
    }

    public function test_mesmo_codigo_em_tenants_diferentes_e_permitido(): void
    {
        $b = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($b);
        $escolaB = $this->escola($b, 'Escola B');
        $turmaB = $this->naEscola($b, $escolaB, fn (): Turma => Turma::create(['nome' => '6º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
        $this->http()->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Ana', 'turma_id' => $this->turma->id, 'inep_id' => '777'])->assertCreated();

        $this->como($adminB, $b)->withHeader('X-Escola-ID', (string) $escolaB->id)->postJson('/api/escola/alunos', ['cpf' => $this->cpf(), 'nome' => 'Bia', 'turma_id' => $turmaB->id, 'inep_id' => '777'])->assertCreated();
    }

    public function test_turma_guarda_o_codigo_inep_e_ele_e_unico(): void
    {
        $turno = $this->noTenant($this->tenant, fn () => Turno::query()->firstOrFail());
        $id = $this->http()->postJson('/api/escola/turmas', ['nome' => '7º A', 'turno_id' => $turno->id, 'ano_letivo' => 2026, 'inep' => '4455'])
            ->assertCreated()->assertJsonPath('inep', '4455')->json('id');

        $this->http()->postJson('/api/escola/turmas', ['nome' => '7º B', 'turno_id' => $turno->id, 'ano_letivo' => 2026, 'inep' => '4455'])
            ->assertUnprocessable()->assertJsonValidationErrors(['inep']);
        $this->http()->putJson("/api/escola/turmas/{$id}", ['inep' => '4455'])->assertOk()->assertJsonPath('inep', '4455');
        $this->http()->postJson('/api/escola/turmas', ['nome' => '7º C', 'turno_id' => $turno->id, 'ano_letivo' => 2026])->assertCreated()->assertJsonPath('inep', null);
    }
}

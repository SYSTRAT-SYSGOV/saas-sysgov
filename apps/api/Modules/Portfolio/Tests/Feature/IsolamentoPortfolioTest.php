<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Tests\Concerns\VariasEscolas;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class IsolamentoPortfolioTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;
    use VariasEscolas;

    public function test_indices_comecam_por_tenant(): void
    {
        foreach (['portfolio_trabalhos', 'portfolio_imagens'] as $tabela) {
            foreach (Schema::getIndexes($tabela) as $indice) {
                if (!$indice['primary']) {
                    $this->assertSame('tenant_id', $indice['columns'][0], "{$tabela}: {$indice['name']}");
                }
            }
        }
    }

    public function test_trabalho_de_um_tenant_nao_aparece_no_outro(): void
    {
        $a = $this->criarTenant('escola-a');
        $b = $this->criarTenant('escola-b');
        $turma = $this->turma($a);
        $materia = $this->materia($a);
        $aluno = $this->aluno($a, $turma, 'Ana');
        $autor = $this->usuario($a);

        $this->noTenant($a, fn () => Trabalho::create([
            'aluno_id' => $aluno->id, 'turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026,
            'titulo' => 'Maquete', 'data' => '2026-06-10', 'avaliacao_decimos' => 85, 'registrado_por' => $autor->id,
        ]));

        $this->assertSame(1, $this->noTenant($a, fn () => Trabalho::count()));
        $this->assertSame(0, $this->noTenant($b, fn () => Trabalho::count()));
    }

    public function test_trabalho_de_outra_escola_do_mesmo_tenant_nao_aparece(): void
    {
        $tenant = $this->criarTenant();
        $escolaA = $this->novaEscola($tenant, 'Escola A');
        $escolaB = $this->novaEscola($tenant, 'Escola B');
        $autor = $this->usuario($tenant);

        // Os helpers do cenário limpam o tenant ao terminar: cada criação vai num naEscola próprio.
        $turma = $this->naEscola($tenant, $escolaA, fn () => $this->turma($tenant));
        $materia = $this->naEscola($tenant, $escolaA, fn () => $this->materia($tenant));
        $aluno = $this->naEscola($tenant, $escolaA, fn () => $this->aluno($tenant, $turma, 'Ana'));
        $this->naEscola($tenant, $escolaA, fn () => Trabalho::create([
            'aluno_id' => $aluno->id, 'turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026,
            'titulo' => 'Maquete', 'data' => '2026-06-10', 'avaliacao_decimos' => 85, 'registrado_por' => $autor->id,
        ]));

        $this->assertSame(1, $this->naEscola($tenant, $escolaA, fn () => Trabalho::count()));
        $this->assertSame(0, $this->naEscola($tenant, $escolaB, fn () => Trabalho::count()));
    }
}

<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\VariasEscolas;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Formatura por escola (change educacao-multiescola, fase A). */
final class MultiEscolaFormaturaTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;
    use VariasEscolas;

    private Tenant $tenant;

    private Escola $escolaA;

    private Escola $escolaB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->escolaA = $this->novaEscola($this->tenant, 'Escola A');
        $this->escolaB = $this->novaEscola($this->tenant, 'Escola B');
    }

    private function naEscolaHttp(Escola $escola): static
    {
        return $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $escola->id);
    }

    /** @return array{0: Turma, 1: Aluno} */
    private function turmaEAluno(Escola $escola, string $nome): array
    {
        return $this->naEscola($this->tenant, $escola, function () use ($nome): array {
            $turma = Turma::create(['nome' => '3º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]);

            return [$turma, Aluno::create(['nome' => $nome, 'turma_id' => $turma->id, 'situacao' => 'ativo'])];
        });
    }

    private function configurar(Escola $escola, Turma $turma, int $valor): void
    {
        $this->naEscolaHttp($escola)->putJson('/api/formatura/configuracao', [
            'ano_letivo' => 2026, 'titulo' => 'Formatura 2026', 'tipo_calculo' => 'por_pessoa',
            'valor_base_centavos' => $valor, 'convidados_incluidos_padrao' => 2, 'max_parcelas' => 12,
            'formas_pagamento' => ['pix', 'dinheiro'], 'chaves_pix' => ['escola@pix.gov.br'], 'turmas_ids' => [$turma->id],
        ])->assertOk();
    }

    public function test_cada_escola_tem_a_sua_formatura_do_ano(): void
    {
        [$turmaA] = $this->turmaEAluno($this->escolaA, 'FORMANDO A');
        [$turmaB] = $this->turmaEAluno($this->escolaB, 'FORMANDO B');

        $this->configurar($this->escolaA, $turmaA, 15000);
        $this->configurar($this->escolaB, $turmaB, 22000);

        $this->naEscolaHttp($this->escolaA)->getJson('/api/formatura/configuracao?ano_letivo=2026')->assertOk()->assertJsonPath('valor_base_centavos', 15000);
        $this->naEscolaHttp($this->escolaB)->getJson('/api/formatura/configuracao?ano_letivo=2026')->assertOk()->assertJsonPath('valor_base_centavos', 22000);
    }

    public function test_pagamento_para_aluno_de_outra_escola_e_rejeitado(): void
    {
        [$turmaA] = $this->turmaEAluno($this->escolaA, 'FORMANDO A');
        [, $alunoB] = $this->turmaEAluno($this->escolaB, 'FORMANDO B');
        $this->configurar($this->escolaA, $turmaA, 15000);

        $this->naEscolaHttp($this->escolaA)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $alunoB->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10',
            'valor_centavos' => 10000, 'forma_pagamento' => 'dinheiro',
        ])->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->assertSame(0, Pagamento::withoutGlobalScopes()->count());
    }
}

<?php

declare(strict_types=1);

namespace Modules\Passeio\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\VariasEscolas;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Tests\Concerns\CenarioPasseio;
use Modules\Passeio\Tests\TestCase;

/** Passeios por escola (change educacao-multiescola, fase A). */
final class MultiEscolaPasseioTest extends TestCase
{
    use CenarioPasseio;
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

    private function criarPasseio(Escola $escola, string $nome): int
    {
        return (int) $this->naEscolaHttp($escola)->postJson('/api/passeio/passeios', [
            'nome' => $nome, 'data_passeio' => '2026-10-20', 'data_limite_autorizacao' => '2026-10-10',
            'horario_saida' => '07:30', 'local_saida' => 'Portão da escola', 'destino' => 'Museu', 'cidade' => 'Curitiba',
            'valor_centavos' => 5000, 'responsavel' => 'Coordenação',
        ])->assertCreated()->json('id');
    }

    public function test_passeio_de_outra_escola_nao_aparece(): void
    {
        $this->criarPasseio($this->escolaA, 'Museu da escola A');
        $this->criarPasseio($this->escolaB, 'Zoológico da escola B');

        $lista = $this->naEscolaHttp($this->escolaB)->getJson('/api/passeio/passeios')->assertOk()->json();
        /** @var list<array<string, mixed>> $itens */
        $itens = $lista['data'] ?? $lista;
        $nomes = collect($itens)->pluck('nome')->all();

        $this->assertContains('Zoológico da escola B', $nomes);
        $this->assertNotContains('Museu da escola A', $nomes);
    }

    public function test_inscricao_de_aluno_de_outra_escola_e_rejeitada(): void
    {
        $passeioA = $this->criarPasseio($this->escolaA, 'Museu');
        $alunoB = $this->naEscola($this->tenant, $this->escolaB, function (): Aluno {
            $turma = Turma::create(['nome' => '3º B', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]);

            return Aluno::create(['nome' => 'ALUNO B', 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        });

        $this->naEscolaHttp($this->escolaA)->postJson("/api/passeio/passeios/{$passeioA}/inscricoes", ['aluno_id' => $alunoB->id])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->assertSame(0, Inscricao::withoutGlobalScopes()->count());
    }
}

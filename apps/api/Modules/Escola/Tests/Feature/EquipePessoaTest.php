<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;

/** Equipe e professores a partir do Cadastro de Pessoas (change educacao-multiescola, fase C). */
final class EquipePessoaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant);
    }

    private function pessoa(string $nome, string $cpf): Pessoa
    {
        return $this->noTenant($this->tenant, fn (): Pessoa => Pessoa::create(['nome' => $nome, 'cpf' => $cpf]));
    }

    public function test_pedagoga_escolhida_no_cadastro_de_pessoas(): void
    {
        $pessoa = $this->pessoa('Joana Pedagoga', '52998224725');

        $this->como($this->admin, $this->tenant)->getJson('/api/escola/pessoas?busca=Joana')
            ->assertOk()->assertJsonPath('0.id', $pessoa->id)->assertJsonPath('0.cpf_mascarado', '***.982.247-**')->assertJsonMissingPath('0.cpf');

        $this->como($this->admin, $this->tenant)->postJson('/api/escola/equipe', ['pessoa_id' => $pessoa->id, 'cargo' => 'pedagoga'])
            ->assertCreated()->assertJsonPath('nome', 'Joana Pedagoga')->assertJsonPath('pessoa_id', $pessoa->id);
    }

    public function test_nome_corrigido_na_pessoa_reflete_na_equipe(): void
    {
        $pessoa = $this->pessoa('Joana Pedagoga', '52998224725');
        $this->como($this->admin, $this->tenant)->postJson('/api/escola/equipe', ['pessoa_id' => $pessoa->id, 'cargo' => 'pedagoga'])->assertCreated();

        $this->noTenant($this->tenant, fn () => $pessoa->update(['nome' => 'Joana Silva Pedagoga']));

        $this->como($this->admin, $this->tenant)->getJson('/api/escola/equipe')->assertOk()->assertJsonPath('0.nome', 'Joana Silva Pedagoga');
    }

    public function test_membro_antigo_so_por_nome_continua_funcionando(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/escola/equipe', ['nome' => 'Diretor Antigo', 'cargo' => 'diretor'])
            ->assertCreated()->assertJsonPath('pessoa_id', null);
    }

    public function test_pessoa_de_outro_tenant_e_recusada(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $alheia = $this->noTenant($outro, fn (): Pessoa => Pessoa::create(['nome' => 'De Fora', 'cpf' => '11144477735']));

        $this->como($this->admin, $this->tenant)->postJson('/api/escola/equipe', ['pessoa_id' => $alheia->id, 'cargo' => 'secretaria'])
            ->assertStatus(422)->assertJsonValidationErrors('pessoa_id');
        $this->como($this->admin, $this->tenant)->getJson('/api/escola/pessoas?busca=De Fora')->assertOk()->assertJsonCount(0);
    }

    public function test_professor_aparece_com_o_nome_da_pessoa(): void
    {
        $professor = $this->usuario($this->tenant, ['escola_secretaria'], 'prof.login');
        $pessoa = $this->pessoa('Carlos Professor', '11144477735');
        $this->noTenant($this->tenant, fn () => PessoaUsuario::query()->forceCreate([
            'tenant_id' => $this->tenant->id, 'pessoa_id' => $pessoa->id, 'user_id' => $professor->id, 'promovido_em' => now(),
        ]));

        /** @var list<array<string, mixed>> $professores */
        $professores = $this->como($this->admin, $this->tenant)->getJson('/api/escola/professores')->assertOk()->json();
        $lista = collect($professores);

        $this->assertSame('Carlos Professor', $lista->firstWhere('id', $professor->id)['name']);
        $this->assertSame($pessoa->id, $lista->firstWhere('id', $professor->id)['pessoa_id']);
    }
}

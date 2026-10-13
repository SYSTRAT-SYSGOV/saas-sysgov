<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\AlunoContato;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefa 5.4 — telefone do formando mantido no cadastro escolar (D14). */
final class TelefoneFormandoTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_atualiza_o_principal_e_preserva_os_demais_contatos(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $this->contatos($tenant, $aluno, ['(41) 1111-1111', '(41) 2222-2222']);

        $this->como($this->usuario($tenant), $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'telefone' => '(41) 99999-0000'])
            ->assertOk()->assertJsonPath('telefone', '(41) 99999-0000');

        $this->assertSame(['(41) 99999-0000', '(41) 2222-2222'], $this->telefones($tenant, $aluno));
        $this->assertTrue(AuditLog::query()->where('module', 'escola')->where('action', 'aluno.telefone_atualizado')->exists());
    }

    public function test_cria_quando_nao_ha_contato_e_remove_com_vazio(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $comissao = $this->usuario($tenant);

        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'telefone' => '41999990000'])->assertOk();
        $this->assertSame(['41999990000'], $this->telefones($tenant, $aluno));

        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'telefone' => ''])->assertOk()
            ->assertJsonPath('telefone', null);
        $this->assertSame([], $this->telefones($tenant, $aluno));
    }

    public function test_sem_a_chave_telefone_os_contatos_nao_mudam(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $this->contatos($tenant, $aluno, ['(41) 1111-1111']);

        $this->como($this->usuario($tenant), $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])->assertOk()
            ->assertJsonPath('telefone', '(41) 1111-1111');
        $this->assertSame(['(41) 1111-1111'], $this->telefones($tenant, $aluno));
    }

    public function test_listagem_traz_o_telefone_e_tesouraria_nao_altera(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $this->contatos($tenant, $aluno, ['(41) 1111-1111']);
        $tesouraria = $this->usuario($tenant, ['formatura_tesouraria']);

        $this->como($tesouraria, $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')
            ->assertOk()->assertJsonPath('0.telefone', '(41) 1111-1111');
        $this->como($tesouraria, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'telefone' => '1'])
            ->assertStatus(403);
    }

    public function test_telefone_igual_nao_gera_auditoria(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $this->contatos($tenant, $aluno, ['(41) 1111-1111']);

        $this->como($this->usuario($tenant), $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'telefone' => ' (41) 1111-1111 '])->assertOk();

        $this->assertFalse(AuditLog::query()->where('module', 'escola')->where('action', 'aluno.telefone_atualizado')->exists());
    }

    /** @param list<string> $telefones */
    private function contatos(Tenant $tenant, Aluno $aluno, array $telefones): void
    {
        $this->noTenant($tenant, function () use ($aluno, $telefones): void {
            foreach ($telefones as $ordem => $telefone) {
                AlunoContato::create(['aluno_id' => $aluno->id, 'telefone' => $telefone, 'descricao' => null, 'ordem' => $ordem]);
            }
        });
    }

    /** @return list<string> */
    private function telefones(Tenant $tenant, Aluno $aluno): array
    {
        return $this->noTenant($tenant, fn (): array => $aluno->contatos()->pluck('telefone')->all());
    }
}

<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefa 5B.1 — um só número de convidados (D16). */
final class ConvidadosTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_convidados_unico_define_o_valor_devido(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant, ['tipo_calculo' => 'fixo_mais_convidados', 'valor_base_centavos' => 50000, 'valor_pessoa_extra_centavos' => 8000]);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $comissao = $this->usuario($tenant);

        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])
            ->assertOk()->assertJsonPath('convidados', 0)->assertJsonPath('valor_devido_centavos', 50000);
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'convidados' => 3])
            ->assertOk()->assertJsonPath('convidados', 3)->assertJsonPath('valor_devido_centavos', 74000);
    }

    public function test_migration_converte_incluidos_em_convidados(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Antigo');
        $id = $this->noTenant($tenant, fn (): int => Participacao::create([
            'configuracao_id' => DB::table('formatura_configuracoes')->value('id'), 'aluno_id' => $aluno->id,
            'participa' => true, 'convidados_incluidos' => 2, 'convidados_extras' => 1,
        ])->id);

        (require base_path('Modules/Formatura/Database/Migrations/2026_09_29_120000_unifica_convidados_formatura.php'))->up();

        $this->assertSame(['convidados_incluidos' => 0, 'convidados_extras' => 3], (array) DB::table('formatura_participacoes')->where('id', $id)->first(['convidados_incluidos', 'convidados_extras']));
        $this->assertSame(0, (int) DB::table('formatura_configuracoes')->value('convidados_incluidos_padrao'));
    }
}

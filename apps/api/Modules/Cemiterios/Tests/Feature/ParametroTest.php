<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use LogicException;
use Modules\Cemiterios\Models\Parametro;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/parametros */
final class ParametroTest extends CemiteriosTestCase
{
    public function test_tenant_novo_recebe_valores_de_referencia(): void
    {
        $t = $this->criarTenant();

        $this->como($this->admin($t), $t)->getJson('/api/cemiterios/parametros')
            ->assertOk()
            ->assertJsonPath('vigente.prazo_exumacao_adulto_anos', 3)
            ->assertJsonPath('vigente.prazo_exumacao_crianca_anos', 2)
            ->assertJsonPath('vigente.idade_limite_crianca', 6)
            ->assertJsonPath('vigente.edital_prazo_dias', 30)
            ->assertJsonPath('vigente.obras_simultaneas_max', 2);
    }

    public function test_edital_fora_da_faixa_legal_e_rejeitado(): void
    {
        $t = $this->criarTenant();

        $this->como($this->admin($t), $t)->postJson('/api/cemiterios/parametros', ['edital_prazo_dias' => 5])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('edital_prazo_dias');
    }

    public function test_nova_versao_nao_altera_a_anterior_e_e_imutavel(): void
    {
        $t = $this->criarTenant();
        $admin = $this->admin($t);

        $this->como($admin, $t)->getJson('/api/cemiterios/parametros')->assertOk();
        $this->travel(1)->seconds();
        $this->como($admin, $t)->postJson('/api/cemiterios/parametros', ['prazo_exumacao_adulto_anos' => 5])->assertCreated();

        $this->noTenant($t);
        $versoes = Parametro::orderBy('vigencia_inicio')->get();
        self::assertSame([3, 5], $versoes->pluck('prazo_exumacao_adulto_anos')->all());

        $this->expectException(LogicException::class);
        $versoes->first()->update(['prazo_exumacao_adulto_anos' => 4]);
    }

    public function test_sem_permissao_recebe_403(): void
    {
        $t = $this->criarTenant();

        $this->como($this->usuario($t, ['cemiterios.view']), $t)
            ->postJson('/api/cemiterios/parametros', ['prazo_exumacao_adulto_anos' => 4])
            ->assertForbidden();
    }

    public function test_parametros_sao_isolados_por_municipio(): void
    {
        $a = $this->criarTenant('pref-a');
        $b = $this->criarTenant('pref-b');

        $this->como($this->admin($a), $a)->postJson('/api/cemiterios/parametros', ['prazo_exumacao_adulto_anos' => 5])->assertCreated();

        $this->como($this->admin($b), $b)->getJson('/api/cemiterios/parametros')
            ->assertJsonPath('vigente.prazo_exumacao_adulto_anos', 3);
    }
}

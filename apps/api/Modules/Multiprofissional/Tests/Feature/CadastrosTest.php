<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Multiprofissional\Tests\Concerns\CenarioMultiprofissional;
use Modules\Multiprofissional\Tests\TestCase;
use Modules\Multiprofissional\Models\TipoAtendimento;
use Modules\Pessoas\Services\ResolucaoPessoaService;

final class CadastrosTest extends TestCase
{
    use CenarioMultiprofissional;
    use RefreshDatabase;

    public function test_itens_padrao_nao_se_repetem(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);

        $this->como($gestor, $t)->postJson('/api/multiprofissional/cadastros/padroes')->assertOk();
        $this->como($gestor, $t)->postJson('/api/multiprofissional/cadastros/padroes')->assertOk()->assertJson(['data' => ['cargos' => 0, 'tipos' => 0]]);

        $tipos = $this->como($gestor, $t)->getJson('/api/multiprofissional/cadastros/tipos-atendimento')->assertOk()->json('data');
        self::assertCount(1, array_filter($tipos, fn (array $x): bool => $x['nome'] === 'Avaliação'));
    }

    public function test_tipo_em_uso_e_desativado_em_vez_de_excluido(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla Psicóloga');
        $this->registrarAtendimento($gestor, $t, $prof)->assertCreated();
        $tipo = $this->dado($t, 'tipo');

        $this->como($gestor, $t)->deleteJson("/api/multiprofissional/cadastros/tipos-atendimento/{$tipo->id}")->assertOk()->assertJson(['excluido' => false]);
        self::assertFalse($this->noTenant($t, fn () => TipoAtendimento::findOrFail($tipo->id))->ativo);
    }

    public function test_consulta_nao_altera_cadastros(): void
    {
        $t = $this->criarTenant();
        $consulta = $this->usuario($t, ['multiprofissional_consulta']);

        $this->como($consulta, $t)->postJson('/api/multiprofissional/cadastros/cargos', ['nome' => 'Novo'])->assertForbidden();
        $this->como($consulta, $t)->getJson('/api/multiprofissional/cadastros/condicoes')->assertForbidden();
        $this->como($consulta, $t)->getJson('/api/multiprofissional/cadastros/cargos')->assertOk();
    }

    public function test_profissional_reaproveita_pessoa_e_nao_repete_cpf(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $pessoa = $this->noTenant($t, fn () => app(ResolucaoPessoaService::class)->resolverPorCpf('52998224725', ['nome' => 'Carla Existente'], 'teste'));

        $prof = $this->profissional($t, $gestor, '529.982.247-25', 'Outro Nome');
        self::assertSame($pessoa->id, $prof->pessoa_id);
        self::assertSame('Carla Existente', $prof->nome);
        self::assertStringNotContainsString('98224', $prof->cpf_mascarado);

        $this->como($gestor, $t)->postJson('/api/multiprofissional/profissionais', [
            'cpf' => '52998224725', 'nome' => 'Duplicado', 'cargo_id' => $this->dado($t, 'cargo')->id,
        ])->assertUnprocessable()->assertJson(['error' => 'Já existe um profissional com esse CPF.']);

        $this->como($gestor, $t)->postJson('/api/multiprofissional/profissionais', [
            'cpf' => '12345678900', 'nome' => 'CPF Inválido', 'cargo_id' => $this->dado($t, 'cargo')->id,
        ])->assertUnprocessable();
    }

    public function test_usuario_de_outro_tenant_nao_pode_ser_ligado(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestor = $this->usuario($a, ['multiprofissional_coordenacao']);
        $deFora = $this->usuario($b, ['multiprofissional_profissional']);

        $this->como($gestor, $a)->postJson('/api/multiprofissional/profissionais', [
            'cpf' => '52998224725', 'nome' => 'Carla', 'cargo_id' => $this->dado($a, 'cargo')->id, 'user_id' => $deFora->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('user_id');
    }

    public function test_equipe_com_profissionais_e_escolas(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $p1 = $this->profissional($t, $gestor, '52998224725', 'Carla');
        $p2 = $this->profissional($t, $gestor, '11144477735', 'Diego');

        $this->como($gestor, $t)->postJson('/api/multiprofissional/equipes', [
            'nome' => 'Equipe Norte', 'turno' => 'manha',
            'profissionais' => [$p1->id, $p2->id],
            'escolas' => [$this->dado($t, 'centro')->id, $this->dado($t, 'norte')->id],
        ])->assertCreated()->assertJsonCount(2, 'data.profissionais')->assertJsonCount(2, 'data.escolas');
    }

    public function test_busca_de_usuarios_so_do_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestor = $this->usuario($a, ['multiprofissional_coordenacao']);
        $daCasa = $this->usuario($a, ['multiprofissional_profissional']);
        $deFora = $this->usuario($b, ['multiprofissional_profissional']);

        /** @var list<array{id: int}> $achados */
        $achados = $this->como($gestor, $a)->getJson('/api/multiprofissional/usuarios?q=Usu')->assertOk()->json('data');
        $ids = array_column($achados, 'id');
        self::assertContains($daCasa->id, $ids);
        self::assertNotContains($deFora->id, $ids);
        $this->como($daCasa, $a)->getJson('/api/multiprofissional/usuarios?q=Usu')->assertForbidden();
    }
}

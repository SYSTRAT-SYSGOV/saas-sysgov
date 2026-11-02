<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Models\CensoLeiaute;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class LeiauteImportacaoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    private const URL = '/api/transporte/censo/importacao/leiautes';

    /**
     * @param array<string, mixed> $leiaute
     * @return array<string, mixed> campo do leiaute pela chave
     */
    private function campo(array $leiaute, string $chave): array
    {
        foreach ($leiaute['campos'] as $c) {
            if ($c['chave'] === $chave) {
                return $c;
            }
        }
        $this->fail("Campo {$chave} não encontrado");
    }

    public function test_primeiro_acesso_cria_o_leiaute_educacenso_2023_como_padrao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $lista = $this->como($g, $t)->getJson(self::URL)->assertOk()->json('data');

        $this->assertCount(1, $lista);
        $this->assertSame('Educacenso 2023', $lista[0]['nome']);
        $this->assertTrue($lista[0]['padrao']);
        $leiaute = $this->como($g, $t)->getJson(self::URL . '/' . $lista[0]['id'])->assertOk()->json('data');
        $cpf = $this->campo($leiaute, 'pessoa_cpf');
        $this->assertSame([4, '30', true, true], [$cpf['posicao'], $cpf['registro'], $cpf['ativo'], $cpf['sensivel']]);
        $this->assertSame(20, $this->campo($leiaute, 'transporte_publico')['posicao']);
    }

    public function test_mudar_a_posicao_de_um_campo_nativo_fica_salvo_e_so_o_que_difere_e_guardado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');

        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 44], ['chave' => 'pessoa_cpf', 'posicao' => 4]]])->assertOk();

        $this->assertSame(44, $this->campo($r->json('data'), 'pessoa_cep')['posicao']);
        $this->assertSame(41, $this->campo($r->json('data'), 'pessoa_cep')['posicao_padrao']);
        $this->assertSame([['chave' => 'pessoa_cep', 'posicao' => 44]], CensoLeiaute::query()->findOrFail($id)->campos);
    }

    public function test_excluir_campo_nativo_o_desativa_e_restaurar_o_padrao_o_reativa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');

        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_email', 'ativo' => false]]])->assertOk();
        $this->assertFalse($this->campo($r->json('data'), 'pessoa_email')['ativo']);

        $r = $this->como($g, $t)->postJson(self::URL . "/{$id}/restaurar")->assertOk();
        $this->assertTrue($this->campo($r->json('data'), 'pessoa_email')['ativo']);
        $this->assertSame([], CensoLeiaute::query()->findOrFail($id)->campos);
    }

    public function test_campo_travado_nao_pode_ser_desativado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');

        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'matricula_escola_inep', 'ativo' => false]]])->assertStatus(422);

        $this->assertStringContainsString('necessário para conciliar', $r->json('error'));
    }

    public function test_duas_colunas_na_mesma_posicao_do_mesmo_registro_sao_recusadas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');

        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 80]]])->assertStatus(422);

        $this->assertStringContainsString('mesma posição (80)', $r->json('error'));
        $this->assertSame([], CensoLeiaute::query()->findOrFail($id)->campos);
    }

    public function test_criar_e_excluir_campo_personalizado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');
        $novo = ['chave' => 'poder_publico', 'registro' => '60', 'posicao' => 21, 'rotulo' => 'Poder público responsável', 'tipo' => 'codigo', 'destino' => 'matricula.transporte', 'mapa' => ['1' => 'Estadual', '2' => 'Municipal']];

        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [$novo]])->assertOk();

        $criado = $this->campo($r->json('data'), 'poder_publico');
        $this->assertFalse($criado['nativo']);
        $this->assertSame('extra.aluno', $criado['destino'], 'o destino vem do registro, nunca do cliente');
        $this->assertSame(['1' => 'Estadual', '2' => 'Municipal'], $criado['mapa']);

        // Personalizado que some da lista é excluído; nativo que não foi mandado continua como estava.
        $r = $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 41]]])->assertOk();
        $chaves = array_column($r->json('data.campos'), 'chave');
        $this->assertNotContains('poder_publico', $chaves);
        $this->assertContains('transporte_publico', $chaves);
    }

    public function test_campo_personalizado_invalido_e_recusado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');
        $base = ['chave' => 'extra_a', 'registro' => '30', 'posicao' => 70, 'rotulo' => 'Extra A', 'tipo' => 'texto'];

        foreach ([['chave' => 'Chave Ruim'], ['registro' => '99'], ['tipo' => 'blob'], ['posicao' => 0], ['posicao' => 999], ['rotulo' => '']] as $defeito) {
            $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [[...$base, ...$defeito]]])->assertStatus(422);
        }
        $this->assertSame([], CensoLeiaute::query()->findOrFail($id)->campos);
    }

    public function test_duplicar_para_novo_ano_nao_afeta_o_original(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');
        $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 44]]])->assertOk();

        $copia = $this->como($g, $t)->postJson(self::URL, ['nome' => 'Educacenso 2024', 'ano_censo' => 2024])->assertCreated()->json('data');
        $this->assertSame(44, $this->campo($copia, 'pessoa_cep')['posicao']);
        $this->assertFalse($copia['padrao']);

        $this->como($g, $t)->putJson(self::URL . "/{$copia['id']}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 45]]])->assertOk();
        $this->assertSame(44, $this->campo($this->como($g, $t)->getJson(self::URL . "/{$id}")->json('data'), 'pessoa_cep')['posicao']);

        $this->como($g, $t)->postJson(self::URL, ['nome' => 'Educacenso 2024', 'ano_censo' => 2024])->assertStatus(409);
    }

    public function test_padrao_nao_se_exclui_e_outro_leiaute_pode_virar_padrao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');
        $this->como($g, $t)->deleteJson(self::URL . "/{$id}")->assertStatus(409);

        $novo = $this->como($g, $t)->postJson(self::URL, ['nome' => 'Educacenso 2024', 'ano_censo' => 2024])->json('data.id');
        $this->como($g, $t)->postJson(self::URL . "/{$novo}/padrao")->assertOk();
        $this->assertSame([false, true], [CensoLeiaute::query()->find($id)->padrao, CensoLeiaute::query()->find($novo)->padrao]);

        $this->como($g, $t)->deleteJson(self::URL . "/{$id}")->assertOk();
        $this->assertNull(CensoLeiaute::query()->find($id));
    }

    public function test_alteracao_de_leiaute_e_auditada_com_os_nomes_dos_campos(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson(self::URL)->json('data.0.id');

        $this->como($g, $t)->putJson(self::URL . "/{$id}", ['campos' => [['chave' => 'pessoa_cep', 'posicao' => 44], ['chave' => 'pessoa_email', 'ativo' => false]]])->assertOk();

        $log = AuditLog::query()->where('action', 'censo_leiaute.salvo')->latest('id')->firstOrFail();
        $this->assertEqualsCanonicalizing(['pessoa_cep', 'pessoa_email'], $log->after['campos_alterados']);
    }

    public function test_permissoes_ler_exige_importar_e_alterar_exige_leiaute(): void
    {
        $t = $this->criarTenant();
        $operador = $this->usuario($t, ['transporte_operador']);
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $coord = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($coord, $t)->getJson(self::URL)->json('data.0.id');

        $this->como($operador, $t)->getJson(self::URL)->assertOk();
        $this->como($operador, $t)->putJson(self::URL . "/{$id}", ['nome' => 'Outro'])->assertForbidden();
        $this->como($operador, $t)->postJson(self::URL, ['nome' => 'X', 'ano_censo' => 2024])->assertForbidden();
        $this->como($consulta, $t)->getJson(self::URL)->assertForbidden();
    }

    public function test_leiaute_de_outro_tenant_nao_e_visivel(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $ga = $this->usuario($a, ['transporte_coordenacao']);
        $gb = $this->usuario($b, ['transporte_coordenacao']);
        $idA = $this->como($ga, $a)->getJson(self::URL)->json('data.0.id');

        $this->como($gb, $b)->getJson(self::URL . "/{$idA}")->assertNotFound();
        $this->como($gb, $b)->putJson(self::URL . "/{$idA}", ['nome' => 'Invadido'])->assertNotFound();
    }
}

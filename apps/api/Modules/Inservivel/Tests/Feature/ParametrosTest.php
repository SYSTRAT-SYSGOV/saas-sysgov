<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Services\ParametrosService;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Parâmetros e situações por papel; Configurações e importação (D2, D10). */
final class ParametrosTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    public function test_padroes_sao_idempotentes_e_tem_os_sete_papeis(): void
    {
        $tenant = $this->criarTenant();
        $this->noTenant($tenant, function (): void {
            $servico = app(ParametrosService::class);
            $servico->garantirPadroes();
            $servico->garantirPadroes();
            self::assertSame(7, Situacao::query()->whereNotNull('papel')->count());
            self::assertSame(7, Situacao::query()->count());
            self::assertSame(4, EstadoConservacao::query()->count());
        });
    }

    public function test_renomear_situacao_de_sistema_mantem_o_papel(): void
    {
        $tenant = $this->criarTenant();
        $id = $this->idPapel($tenant, PapelSituacao::Inservivel);

        $this->como($this->usuario($tenant), $tenant)->putJson("/api/inservivel/parametros/situacoes/{$id}", ['nome' => 'Inservível p/ doação'])->assertOk();
        self::assertSame($id, $this->idPapel($tenant, PapelSituacao::Inservivel));
        $this->como($this->usuario($tenant), $tenant)->putJson("/api/inservivel/parametros/situacoes/{$id}", ['nome' => 'X', 'ativo' => false])->assertStatus(422);
    }

    public function test_excluir_situacao_de_sistema_ou_em_uso_responde_422(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $sistema = $this->idPapel($tenant, PapelSituacao::Doado);
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/parametros/situacoes/{$sistema}")->assertStatus(422);

        $livre = $this->como($gestor, $tenant)->postJson('/api/inservivel/parametros/situacoes', ['nome' => 'Aguardando laudo'])->assertCreated()->json('id');
        $this->bem($tenant, '1', PapelSituacao::Inservivel, ['situacao_id' => $livre]);
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/parametros/situacoes/{$livre}")->assertStatus(422)->assertJsonPath('error', 'Exclusão bloqueada: o item está em uso por um ou mais bens.');

        $vazia = $this->como($gestor, $tenant)->postJson('/api/inservivel/parametros/categorias', ['nome' => 'Sem uso'])->assertCreated()->json('id');
        $this->como($gestor, $tenant)->deleteJson("/api/inservivel/parametros/categorias/{$vazia}")->assertOk();
    }

    public function test_substituir_estado_em_massa(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        [$sucata, $novo] = $this->noTenant($tenant, function (): array {
            app(ParametrosService::class)->garantirPadroes();

            return [
                EstadoConservacao::query()->where('nome', 'Sucata')->firstOrFail()->id,
                EstadoConservacao::query()->create(['nome' => 'Inservível - Sucata'])->id,
            ];
        });
        $this->bem($tenant, '1', extra: ['estado_conservacao_id' => $sucata]);
        $this->bem($tenant, '2', extra: ['estado_conservacao_id' => $sucata]);
        $this->bem($tenant, '3');

        $this->como($gestor, $tenant)->postJson('/api/inservivel/parametros/substituir', ['campo' => 'estado_conservacao', 'atual_id' => $sucata, 'novo_id' => $novo])
            ->assertOk()->assertJsonPath('bens_alterados', 2);
        self::assertSame(2, $this->noTenant($tenant, fn () => Bem::query()->where('estado_conservacao_id', $novo)->count()));
    }

    public function test_servidor_nao_altera_parametros(): void
    {
        $tenant = $this->criarTenant();
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)
            ->postJson('/api/inservivel/parametros/categorias', ['nome' => 'Nova'])->assertForbidden();
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->getJson('/api/inservivel/opcoes')->assertOk()
            ->assertJsonCount(7, 'situacoes');
    }

    public function test_configuracao_tem_padroes_e_chave_de_documento_imutavel(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant);
        $config = $this->como($gestor, $tenant)->getJson('/api/inservivel/configuracoes')->assertOk();
        $config->assertJsonCount(6, 'documentos_exigidos')->assertJsonPath('caminho_cadastro_publico', '/inservivel/entidades/prefeitura-a/cadastro');

        $docs = $config->json('documentos_exigidos');
        $docs[5]['obrigatorio'] = false;
        $docs[] = ['nome' => 'Alvará de funcionamento', 'obrigatorio' => true];
        $this->como($gestor, $tenant)->putJson('/api/inservivel/configuracoes', [
            'doador_nome' => 'Município de Exemplo', 'legislacao' => ['Lei 100/2025', ''], 'documentos_exigidos' => $docs,
        ])->assertOk()->assertJsonPath('documentos_exigidos.6.chave', 'alvara_de_funcionamento')
            ->assertJsonPath('documentos_exigidos.5.obrigatorio', false)->assertJsonCount(1, 'legislacao');

        $docs[0]['chave'] = 'outra_chave';
        $this->como($gestor, $tenant)->putJson('/api/inservivel/configuracoes', ['documentos_exigidos' => $docs])->assertStatus(422);
    }
}

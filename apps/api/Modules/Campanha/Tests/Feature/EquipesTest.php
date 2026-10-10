<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Referencia\RefMandatario;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Coordenadores, cabos eleitorais, prefeitos, vereadores e configuração (grupo 5). */
final class EquipesTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const CURITIBA = 4106902;

    private const LONDRINA = 4113700;

    private const JOINVILLE = 4209102;

    public function test_coordenador_e_cabo_com_cpf_mascarado_ajuda_em_centavos_e_regras_de_uf(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $coordenacao = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($campanha, $coordenacao);
        $equipe = $this->como($coordenacao, $tenant, $campanha);

        $coordenador = $equipe->postJson('/api/campanha/coordenadores', ['nome' => 'Carla Regional', 'tipo' => 'regional', 'cpf' => '529.982.247-25', 'regiao' => 'Norte', 'meta_votos' => 8000])
            ->assertCreated()->assertJsonPath('cpf_mascarado', '***.982.247-**')->assertJsonMissingPath('pessoa')->json('id');
        $cabo = $equipe->postJson('/api/campanha/cabos', [
            'nome' => 'João Cabo', 'codigo_ibge' => self::LONDRINA, 'coordenador_id' => $coordenador, 'bairro' => 'Centro',
            'ajuda_custo' => true, 'valor_ajuda_centavos' => 30050, 'votos_estimados' => 150,
        ])->assertCreated()->assertJsonPath('valor_ajuda_centavos', 30050)->assertJsonPath('cpf_mascarado', null)->json('id');

        $equipe->postJson('/api/campanha/cabos', ['nome' => 'Fora', 'codigo_ibge' => self::JOINVILLE])
            ->assertStatus(422)->assertJsonPath('error', 'Município não pertence à UF da campanha.');
        $equipe->getJson('/api/campanha/cabos?codigo_ibge=' . self::LONDRINA)->assertJsonCount(1, 'cabos');
        $equipe->putJson("/api/campanha/cabos/{$cabo}", ['votos_estimados' => 200])->assertOk()->assertJsonPath('votos_estimados', 200);
        $equipe->getJson('/api/campanha/municipios/' . self::LONDRINA)->assertJsonPath('cabos', 1)->assertJsonPath('cabos_eleitorais.0.nome', 'João Cabo');
    }

    public function test_coordenador_com_vinculos_nao_sai_e_exclusao_logica(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);
        $coordenador = $gestao->postJson('/api/campanha/coordenadores', ['nome' => 'Norte', 'tipo' => 'regional'])->json('id');
        $gestao->putJson('/api/campanha/municipios/' . self::CURITIBA, ['coordenador_id' => $coordenador])->assertOk();
        $gestao->putJson('/api/campanha/municipios/' . self::LONDRINA, ['coordenador_id' => $coordenador])->assertOk();

        $gestao->deleteJson("/api/campanha/coordenadores/{$coordenador}")
            ->assertStatus(422)->assertJsonPath('error', 'Este coordenador é responsável por: Curitiba, Londrina. Troque o coordenador desses municípios antes de excluir.');

        $cabo = $gestao->postJson('/api/campanha/cabos', ['nome' => 'Cabo', 'codigo_ibge' => self::CURITIBA])->json('id');
        $gestao->deleteJson("/api/campanha/cabos/{$cabo}")->assertOk();
        $this->naCampanha($campanha, fn () => $this->assertSame(1, CaboEleitoral::withTrashed()->whereNotNull('deleted_at')->count()));
    }

    public function test_registro_de_outra_campanha_pela_url_responde_404_e_consulta_nao_escreve(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $a = $this->campanha($tenant, ['nome' => 'A']);
        $b = $this->campanha($tenant, ['nome' => 'B']);
        $gestao = $this->usuario($tenant);
        $caboDeB = $this->como($gestao, $tenant, $b)->postJson('/api/campanha/cabos', ['nome' => 'De B', 'codigo_ibge' => self::CURITIBA])->json('id');

        $this->como($gestao, $tenant, $a)->getJson('/api/campanha/cabos')->assertJsonCount(0, 'cabos');
        $this->como($gestao, $tenant, $a)->putJson("/api/campanha/cabos/{$caboDeB}", ['nome' => 'Invadido'])->assertNotFound();
        $this->como($gestao, $tenant, $a)->deleteJson("/api/campanha/cabos/{$caboDeB}")->assertNotFound();

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($a, $consulta);
        $this->como($consulta, $tenant, $a)->postJson('/api/campanha/coordenadores', ['nome' => 'X', 'tipo' => 'municipal'])->assertForbidden();
        $this->como($consulta, $tenant, $a)->getJson('/api/campanha/coordenadores')->assertOk();
    }

    public function test_prefeito_aliado_conta_no_painel_e_na_camada(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);

        $gestao->putJson('/api/campanha/prefeitos/' . self::LONDRINA, ['relacao' => 'aliado', 'influencia' => 'alta', 'whatsapp' => '43999990000'])->assertOk();
        $gestao->putJson('/api/campanha/prefeitos/' . self::LONDRINA, ['relacao' => 'aliado', 'influencia' => 'media'])->assertOk()->assertJsonPath('influencia', 'media');
        $gestao->putJson('/api/campanha/prefeitos/' . self::CURITIBA, ['relacao' => 'talvez'])->assertStatus(422);

        $gestao->getJson('/api/campanha/painel')->assertJsonPath('prefeitos_aliados', 1);
        $gestao->getJson('/api/campanha/mapa')->assertJsonPath('municipios.' . self::LONDRINA . '.relacao_prefeito', 'aliado');
        $gestao->getJson('/api/campanha/prefeitos')->assertOk()->assertJsonCount(3, 'prefeitos')
            ->assertJsonPath('prefeitos.1.municipio', 'Londrina')->assertJsonPath('prefeitos.1.nome', 'TIAGO AMARAL')->assertJsonPath('prefeitos.1.relacao', 'aliado');

        $gestao->deleteJson('/api/campanha/prefeitos/' . self::LONDRINA)->assertOk();
        $gestao->getJson('/api/campanha/mapa')->assertJsonPath('municipios.' . self::LONDRINA . '.relacao_prefeito', 'sem_informacao');
    }

    public function test_vereador_eleito_pre_preenchido_e_vereador_nao_eleito_aceito(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);
        $eleita = RefMandatario::query()->where('cargo', 'vereador')->firstOrFail();

        $gestao->postJson('/api/campanha/vereadores', ['codigo_ibge' => self::LONDRINA, 'ref_mandatario_id' => $eleita->id, 'aliado' => true, 'votos_estimados' => 900])
            ->assertCreated()->assertJsonPath('nome', 'VEREADORA ELEITA')->assertJsonPath('partido', 'PL')->assertJsonPath('aliado', true);
        $gestao->postJson('/api/campanha/vereadores', ['codigo_ibge' => self::LONDRINA, 'nome' => 'Suplente Silva', 'partido' => 'PT'])->assertCreated();
        $gestao->postJson('/api/campanha/vereadores', ['codigo_ibge' => self::CURITIBA, 'ref_mandatario_id' => $eleita->id])
            ->assertStatus(422)->assertJsonPath('error', 'Vereador eleito não encontrado neste município.');
        $gestao->postJson('/api/campanha/vereadores', ['codigo_ibge' => self::CURITIBA])
            ->assertStatus(422)->assertJsonPath('error', 'Informe o nome do vereador ou escolha um eleito.');

        $gestao->getJson('/api/campanha/vereadores?aliado=1')->assertJsonCount(1, 'vereadores');
        $gestao->getJson('/api/campanha/painel')->assertJsonPath('vereadores_aliados', 1);
        $gestao->getJson('/api/campanha/municipios/' . self::LONDRINA)->assertJsonCount(2, 'vereadores')->assertJsonPath('vereadores_eleitos.0.nome_urna', 'VEREADORA ELEITA');
    }

    public function test_configuracao_de_cores_e_faixas(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);

        $gestao->putJson('/api/campanha/configuracao', ['faixas_meta' => ['faixas' => [['limite' => 250, 'cor' => '#111111'], ['limite' => 100, 'cor' => '#222222']], 'cor_acima' => '#333333']])
            ->assertStatus(422)->assertJsonPath('error', 'Os limites das faixas de meta devem ser crescentes.');
        $gestao->putJson('/api/campanha/configuracao', ['cores_situacao' => ['risco' => 'vermelho']])->assertStatus(422)->assertJsonValidationErrors('cores_situacao.risco');

        $gestao->putJson('/api/campanha/configuracao', [
            'cores_situacao' => ['risco' => '#b91c1c'],
            'faixas_meta' => ['faixas' => [['limite' => 100, 'cor' => '#3b82f6'], ['limite' => 500, 'cor' => '#10b981']], 'cor_acima' => '#ef4444'],
        ])->assertOk()->assertJsonPath('cores.risco', '#b91c1c')->assertJsonPath('cores.consolidado', '#10b981')->assertJsonPath('faixas.faixas.1.limite', 500);
        $gestao->getJson('/api/campanha/atual')->assertJsonPath('cores.risco', '#b91c1c')->assertJsonPath('faixas.cor_acima', '#ef4444');

        $coordenacao = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($campanha, $coordenacao);
        $this->como($coordenacao, $tenant, $campanha)->putJson('/api/campanha/configuracao', ['cores_situacao' => ['risco' => '#000000']])->assertForbidden();
    }
}

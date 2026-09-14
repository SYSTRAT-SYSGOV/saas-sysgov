<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdFatoresSeeder;
use Modules\Capd\Database\Seeders\CapdPerguntasPadraoSeeder;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

/**
 * Regressão: POST /avaliacoes/{id}/submeter — bug real encontrado ao testar
 * o novo formulário de avaliação no navegador. O fluxo de submissão lançava
 * "Class Modules\Capd\Contracts\AssiduacaoDados not found" porque duas
 * classes (AssiduacaoDados e DisciplinaDados) estavam declaradas juntas em
 * um único arquivo HrDtos.php, quebrando o autoload PSR-4 padrão (nome do
 * arquivo não batia com nenhuma das classes). Isso quebrava TODA submissão
 * de avaliação em produção, silenciosamente, pois nenhum teste cobria essa
 * rota antes.
 */
final class SubmeterAvaliacaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_submeter_avaliacao_calcula_nota_e_conclui_com_sucesso(): void
    {
        $tenant = Tenant::create(['name' => 'Município Submeter', 'slug' => 'pref-submeter', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();
        (new CapdPerguntasPadraoSeeder())->seedTenant($tenant->id);

        $admin = User::create([
            'name' => 'Admin Submeter', 'email' => 'admin.submeter@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Submeter', 'email' => 'servidor.submeter@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233344']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Submeter 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => [
                'F3' => ['grau' => 4], 'F4' => ['grau' => 4], 'F5' => ['grau' => 4],
                'F6' => ['grau' => 4], 'F7' => ['grau' => 4], 'F8' => ['grau' => 4],
            ],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/avaliacoes/{$avaliacao->id}/submeter");

        $response->assertStatus(200);
        $response->assertJsonPath('avaliacao.data_conclusao', fn ($v) => $v !== null);
        $this->assertNotNull($response->json('resultado.nota_final'));

        // RF-02: a avaliação fica vinculada ao modelo de formulário vigente usado no cálculo.
        $this->assertNotNull($response->json('avaliacao.modelo_formulario_id'));

        app(TenantContext::class)->clear();
    }

    /**
     * RF-02 — prova de que os pesos configurados pela Comissão via
     * ModeloFatorPesoController::sync() realmente afetam a nota real da
     * submissão (antes desta migração, a Comissão editava ModeloFatorPeso
     * sem nenhum efeito prático no cálculo).
     */
    public function test_pesos_sincronizados_pela_comissao_afetam_a_nota_real(): void
    {
        $tenant = Tenant::create(['name' => 'Município Pesos Reais', 'slug' => 'pref-pesos-reais', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();
        (new CapdPerguntasPadraoSeeder())->seedTenant($tenant->id);

        $admin = User::create([
            'name' => 'Admin Pesos Reais', 'email' => 'admin.pesos.reais@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Pesos Reais', 'email' => 'servidor.pesos.reais@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233344']);

        // Vincula o servidor ao plano GERAL explicitamente — sem isso, a resolução do
        // modelo vigente fica ambígua entre FORM_GERAL_V1/FORM_MAGISTERIO_V1.
        $planoGeral = \Modules\Capd\Models\PlanoCarreira::where('tenant_id', $tenant->id)->where('codigo', 'GERAL')->firstOrFail();
        Servidor::create([
            'tenant_id' => $tenant->id, 'user_id' => $servidorUser->id, 'matricula' => 'PESOS-REAIS-001',
            'cpf' => '11122233344', 'nome_completo' => 'Servidor Pesos Reais',
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Secretaria de Administração',
            'situacao_funcional' => 'ativo', 'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
            'plano_carreira_id' => $planoGeral->id, 'atende_publico' => true,
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Pesos Reais 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        // Grau 4 (não 5) para F4 propositalmente: graus 1/2/5 acionam a trava
        // antileniência em fatores não automatizados, o que exigiria CIT prévio.
        $respostas = [
            'F3' => ['grau' => 3], 'F4' => ['grau' => 4], 'F5' => ['grau' => 3],
            'F6' => ['grau' => 3], 'F7' => ['grau' => 3], 'F8' => ['grau' => 3],
        ];

        $modelo = \Modules\Capd\Models\ModeloFormulario::where('tenant_id', $tenant->id)
            ->where('codigo', 'FORM_GERAL_V1')->firstOrFail();

        // 1ª submissão: pesos originais do seed (F4 tem peso baixo, pouco impacto do grau 4).
        $av1 = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => $respostas,
        ]);
        $resp1 = $this->actingAs($admin)->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/avaliacoes/{$av1->id}/submeter");
        $resp1->assertStatus(200);
        $notaOriginal = $resp1->json('resultado.nota_final');

        // Comissão concentra quase todo o peso em F4 (onde o servidor tirou o maior grau).
        $fatorF4 = \Modules\Capd\Models\FatorAvaliacao::where('tenant_id', $tenant->id)->where('codigo', 'F4')->firstOrFail();
        $outrosFatores = \Modules\Capd\Models\FatorAvaliacao::where('tenant_id', $tenant->id)->where('codigo', '!=', 'F4')->get();

        $novosPesos = collect([['fator_id' => $fatorF4->id, 'peso' => 65.0]])
            ->merge($outrosFatores->map(fn ($f) => ['fator_id' => $f->id, 'peso' => 5.0]))
            ->values()->all();

        $this->actingAs($admin)->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$modelo->id}/fatores-pesos/sync", ['fatores' => $novosPesos])
            ->assertStatus(200);

        // 2ª submissão (avaliação nova, mesmas respostas): a nota deve mudar,
        // provando que o peso reconfigurado agora tem efeito real no cálculo.
        $av2 = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_PARCIAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => $respostas,
        ]);
        $resp2 = $this->actingAs($admin)->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/avaliacoes/{$av2->id}/submeter");
        $resp2->assertStatus(200);
        $notaComPesoReconfigurado = $resp2->json('resultado.nota_final');

        $this->assertNotEquals($notaOriginal, $notaComPesoReconfigurado);
        // Com 65% do peso em F4 (grau 4 → nota 7,5, acima da média dos demais fatores em grau 3), a nota final deve subir.
        $this->assertGreaterThan((float) $notaOriginal, (float) $notaComPesoReconfigurado);

        app(TenantContext::class)->clear();
    }
}

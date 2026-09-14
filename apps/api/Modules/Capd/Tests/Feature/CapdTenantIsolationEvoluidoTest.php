<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\AvaliacaoUsuario;
use Modules\Capd\Models\ConsolidacaoTrienal;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Models\Quinquenio;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\AvaliacaoUsuarioService;
use Modules\Capd\Services\ConsolidacaoTrienalService;
use Modules\Capd\Services\QuinquenioService;
use Tests\TestCase;

final class CapdTenantIsolationEvoluidoTest extends TestCase
{
    use RefreshDatabase;

    public function test_isolamento_de_tenant_em_ciclos_modelos_e_perguntas(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura Alpha', 'slug' => 'tenant-alpha', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura Beta', 'slug' => 'tenant-beta', 'type' => 'prefeitura', 'status' => 'active']);

        // 1. Criar dados no Tenant A
        app(TenantContext::class)->set($tenantA);

        $cicloA = CicloAvaliacao::create([
            'ano_competencia'       => 2026,
            'nome'                  => 'Ciclo Alpha 2026',
            'data_inicio'           => '2026-01-01',
            'data_fim'              => '2026-12-31',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-12-31',
            'data_limite_recurso'   => '2026-12-15',
        ]);

        $modeloA = ModeloFormulario::create([
            'codigo'          => 'MODELO_ALPHA',
            'nome'            => 'Instrumento de Avaliação Alpha',
            'vigencia_inicio' => '2026-01-01',
        ]);

        $perguntaA = Pergunta::create([
            'modelo_id' => $modeloA->id,
            'codigo'    => 'PA_01',
            'enunciado' => 'Pergunta Exclusiva Alpha',
            'tipo'      => Pergunta::TIPO_ESCALA_GRAFICA,
        ]);

        self::assertSame($tenantA->id, $cicloA->tenant_id);
        self::assertSame($tenantA->id, $modeloA->tenant_id);
        self::assertSame($tenantA->id, $perguntaA->tenant_id);

        // 2. Mudar para Tenant B e verificar isolamento
        app(TenantContext::class)->set($tenantB);

        self::assertSame(0, CicloAvaliacao::count());
        self::assertSame(0, ModeloFormulario::count());
        self::assertSame(0, Pergunta::count());

        // Criar no Tenant B com os mesmos códigos (permitido pela chave composta com tenant_id)
        $cicloB = CicloAvaliacao::create([
            'ano_competencia'       => 2026,
            'nome'                  => 'Ciclo Beta 2026',
            'data_inicio'           => '2026-01-01',
            'data_fim'              => '2026-12-31',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-12-31',
            'data_limite_recurso'   => '2026-12-15',
        ]);

        $modeloB = ModeloFormulario::create([
            'codigo'          => 'MODELO_ALPHA', // Mesmo código, mas do Tenant B
            'nome'            => 'Instrumento de Avaliação Beta',
            'vigencia_inicio' => '2026-01-01',
        ]);

        self::assertSame(1, CicloAvaliacao::count());
        self::assertSame(1, ModeloFormulario::count());
        self::assertSame('Ciclo Beta 2026', CicloAvaliacao::firstOrFail()->nome);
        self::assertSame('Instrumento de Avaliação Beta', ModeloFormulario::firstOrFail()->nome);

        // 3. Voltar para Tenant A e verificar integridade
        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, CicloAvaliacao::count());
        self::assertSame('Ciclo Alpha 2026', CicloAvaliacao::firstOrFail()->nome);
        self::assertSame('Instrumento de Avaliação Alpha', ModeloFormulario::firstOrFail()->nome);

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_tenant_em_consolidacoes_trienais(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura Alpha Consolidacao', 'slug' => 'tenant-alpha-consolidacao', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura Beta Consolidacao', 'slug' => 'tenant-beta-consolidacao', 'type' => 'prefeitura', 'status' => 'active']);

        $criarServidorEConsolidacao = function (Tenant $tenant, string $email): ConsolidacaoTrienal {
            app(TenantContext::class)->set($tenant);

            $user = User::create(['name' => 'Servidor', 'email' => $email, 'password' => bcrypt('secret')]);
            $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

            $servidor = Servidor::create([
                'tenant_id'             => $tenant->id,
                'user_id'               => $user->id,
                'matricula'             => 'MAT-ISO',
                'cpf'                   => '00011122233',
                'nome_completo'         => 'Servidor Isolamento',
                'data_nascimento'       => '1980-05-15',
                'data_admissao'         => '2015-02-01',
                'regime_juridico'       => 'estatutario',
                'regime_previdenciario' => 'rpps',
                'cargo_efetivo'         => 'Contador',
                'orgao_lotacao'         => 'Secretaria de Finanças',
                'situacao_funcional'    => 'ativo',
                'estagio_probatorio'    => false,
                'carga_horaria_semanal' => 40,
            ]);

            $ciclo = CicloAvaliacao::create([
                'tenant_id'       => $tenant->id,
                'nome'            => 'Ciclo Isolamento 2026',
                'ano_competencia' => 2026,
                'data_inicio'     => '2026-01-01',
                'data_fim'        => '2026-12-31',
                'etapa_cadencia'  => 3,
                'nota_corte_nfc'  => '70.00',
            ]);

            return app(ConsolidacaoTrienalService::class)->persistir($servidor, $ciclo, [
                'notas_ciclos' => ['2024' => '80.00'],
                'nfc'          => '80.00',
                'conceito'     => 'Bom',
                'elegivel'     => true,
            ]);
        };

        $criarServidorEConsolidacao($tenantA, 'servidor.alpha@araucaria.pr.gov.br');

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, ConsolidacaoTrienal::count());

        $criarServidorEConsolidacao($tenantB, 'servidor.beta@araucaria.pr.gov.br');
        self::assertSame(1, ConsolidacaoTrienal::count());

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, ConsolidacaoTrienal::count());

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_tenant_em_fatores_customizados_e_avaliacao_usuario(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura Alpha Fatores', 'slug' => 'tenant-alpha-fatores', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura Beta Fatores', 'slug' => 'tenant-beta-fatores', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);

        $fatorA = FatorAvaliacao::create([
            'codigo' => 'F9', 'nome' => 'Fator Alpha', 'descricao' => 'Fator customizado do tenant Alpha.',
            'peso_geral' => 10.00, 'peso_magisterio' => 10.00,
        ]);

        $userA = User::create(['name' => 'Servidor Alpha', 'email' => 'servidor.alpha.fatores@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorA = Servidor::create([
            'tenant_id' => $tenantA->id, 'user_id' => $userA->id, 'matricula' => 'MAT-F1', 'cpf' => '10020030044',
            'nome_completo' => 'Servidor Alpha', 'data_nascimento' => '1980-05-15', 'data_admissao' => '2015-02-01',
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Atendente',
            'orgao_lotacao' => 'Secretaria', 'situacao_funcional' => 'ativo', 'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
        $cicloA = CicloAvaliacao::create([
            'tenant_id' => $tenantA->id, 'nome' => 'Ciclo Alpha', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);
        app(AvaliacaoUsuarioService::class)->registrar($servidorA->id, $cicloA->id, 90.0);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, FatorAvaliacao::count());
        self::assertSame(0, AvaliacaoUsuario::count());

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, FatorAvaliacao::count());
        self::assertSame($fatorA->id, FatorAvaliacao::firstOrFail()->id);
        self::assertSame(1, AvaliacaoUsuario::count());

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_tenant_em_quinquenios(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura Alpha Quinquenio', 'slug' => 'tenant-alpha-quinquenio', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura Beta Quinquenio', 'slug' => 'tenant-beta-quinquenio', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);

        $userA = User::create(['name' => 'Servidor Alpha Quinquenio', 'email' => 'servidor.alpha.quinquenio@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorA = Servidor::create([
            'tenant_id' => $tenantA->id, 'user_id' => $userA->id, 'matricula' => 'MAT-Q1', 'cpf' => '77788899900',
            'nome_completo' => 'Servidor Alpha Quinquenio', 'data_nascimento' => '1980-05-15',
            'data_admissao' => now()->subYears(11)->toDateString(),
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Contador',
            'orgao_lotacao' => 'Secretaria', 'situacao_funcional' => 'ativo', 'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
        app(QuinquenioService::class)->gerarPendentes($servidorA);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Quinquenio::count());

        app(TenantContext::class)->set($tenantA);
        self::assertSame(2, Quinquenio::count());

        app(TenantContext::class)->clear();
    }
}

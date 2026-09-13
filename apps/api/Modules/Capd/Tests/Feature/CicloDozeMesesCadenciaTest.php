<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Services\CicloService;
use Modules\Capd\Services\HomologacaoLoteService;
use Tests\TestCase;

final class CicloDozeMesesCadenciaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private CicloService $cicloService;
    private HomologacaoLoteService $homologacaoService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Municipal Teste',
            'slug'   => 'pref-teste-ciclo',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->cicloService = app(CicloService::class);
        $this->homologacaoService = app(HomologacaoLoteService::class);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_cadencia_anual_automatica_e_trienio(): void
    {
        $cicloAno1 = $this->cicloService->criarCiclo([
            'ano_competencia'     => 2026,
            'nome'                => 'Ciclo Anual 2026 (Ano 1)',
            'data_inicio'         => '2026-01-01',
            'data_fim'            => '2026-12-31',
            'cadencia_automatica' => true,
            'etapa_cadencia'      => 1,
        ]);

        self::assertSame(2026, $cicloAno1->ano_competencia);
        self::assertSame(1, $cicloAno1->etapa_cadencia);

        // Encerrar ciclo com disparo automático do próximo ano (12 meses)
        $cicloAno1Encerrado = $this->cicloService->encerrarCiclo($cicloAno1, abrirProximo: true);
        self::assertSame(CicloAvaliacao::STATUS_ENCERRADO, $cicloAno1Encerrado->status);

        // Verifica que o ciclo do Ano 2 foi aberto automaticamente
        $ciclos = $this->cicloService->listarCiclos();
        self::assertCount(2, $ciclos);

        $cicloAno2 = $ciclos->firstWhere('ano_competencia', 2027);
        self::assertNotNull($cicloAno2);
        self::assertSame(2, $cicloAno2->etapa_cadencia);
        self::assertSame('2027-01-01', $cicloAno2->data_inicio->toDateString());
    }

    public function test_bloqueio_de_homologacao_com_avaliacoes_ou_recursos_pendentes(): void
    {
        $ciclo = $this->cicloService->criarCiclo([
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'status'          => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);

        $user = User::create(['name' => 'Carlos Servidor', 'email' => 'carlos@teste.gov.br', 'password' => bcrypt('password')]);
        $avaliador = User::create(['name' => 'Avaliador Chefe', 'email' => 'chefe@teste.gov.br', 'password' => bcrypt('password')]);

        // Avaliação pendente de conclusão
        $avaliacao = Avaliacao::create([
            'ciclo_id'          => $ciclo->id,
            'servidor_id'       => $user->id,
            'avaliador_id'      => $avaliador->id,
            'respostas_fatores' => [],
            'data_conclusao'    => null, // Pendente!
            'homologada'        => false,
        ]);

        // Tentativa de homologar deve lançar exceção de bloqueio
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('avaliação(ões) pendente(s) de conclusão');

        $this->homologacaoService->homologarCiclo($ciclo, $avaliador->id);
    }

    public function test_validacao_de_elegibilidade_faltas_afastamentos_e_estagiarios(): void
    {
        $ciclo = $this->cicloService->criarCiclo([
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'regras_config'   => [
                'limite_faltas_injustificadas' => 5,
                'limite_dias_afastamento'     => 180,
                'excluir_estagiarios'         => true,
            ],
        ]);

        $user1 = User::create(['name' => 'Estagiário Lucas', 'email' => 'lucas@teste.gov.br', 'password' => bcrypt('password')]);
        $estagiario = Servidor::create([
            'user_id'         => $user1->id,
            'matricula'       => 'EST-001',
            'nome_completo'   => 'Lucas Estagiário',
            'cpf'             => '333.333.333-33',
            'cargo_efetivo'   => 'Estagiário de TI',
            'regime_juridico' => 'estagiario',
            'orgao_lotacao'   => 'Gabinete',
        ]);

        $checkEstagiario = $this->cicloService->validarElegibilidadeServidor($estagiario, $ciclo);
        self::assertFalse($checkEstagiario['elegivel']);
        self::assertStringContainsString('Estagiários não são submetidos', $checkEstagiario['bloqueios'][0]);

        $user2 = User::create(['name' => 'Marcos Faltoso', 'email' => 'marcos@teste.gov.br', 'password' => bcrypt('password')]);
        $servidorFaltoso = Servidor::create([
            'user_id'         => $user2->id,
            'matricula'       => 'SRV-002',
            'nome_completo'   => 'Marcos Faltoso',
            'cpf'             => '444.444.444-44',
            'cargo_efetivo'   => 'Assistente Administrativo',
            'regime_juridico' => 'estatutario',
            'orgao_lotacao'   => 'Administração',
            'metadata'        => ['faltas_injustificadas' => 8], // > 5 faltas
        ]);

        $checkFaltas = $this->cicloService->validarElegibilidadeServidor($servidorFaltoso, $ciclo);
        self::assertFalse($checkFaltas['elegivel']);
        self::assertStringContainsString('8 falta(s) injustificada(s)', $checkFaltas['bloqueios'][0]);

        $user3 = User::create(['name' => 'Joana Licenca', 'email' => 'joana@teste.gov.br', 'password' => bcrypt('password')]);
        $servidorLicenca = Servidor::create([
            'user_id'         => $user3->id,
            'matricula'       => 'SRV-003',
            'nome_completo'   => 'Joana Licença Longa',
            'cpf'             => '555.555.555-55',
            'cargo_efetivo'   => 'Analista',
            'regime_juridico' => 'estatutario',
            'orgao_lotacao'   => 'Finanças',
        ]);

        ServidorAfastamento::create([
            'servidor_id'        => $servidorLicenca->id,
            'tipo_afastamento'   => 'licenca_tratamento_saude',
            'data_inicio'        => '2026-01-10',
            'data_fim'           => '2026-08-10', // > 200 dias
            'suspende_avaliacao' => true,
        ]);

        $checkLicenca = $this->cicloService->validarElegibilidadeServidor($servidorLicenca, $ciclo);
        self::assertFalse($checkLicenca['elegivel']);
        self::assertStringContainsString('> 180 dias permitidos', $checkLicenca['bloqueios'][0]);
    }
}

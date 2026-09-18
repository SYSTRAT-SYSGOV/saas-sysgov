<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Services\PerguntaService;
use Tests\TestCase;

final class CadastroPerguntasTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private PerguntaService $perguntaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Teste Perguntas',
            'slug'   => 'pref-perguntas',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->perguntaService = app(PerguntaService::class);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_validacao_de_schema_e_criacao_de_modelo_com_escala_grafica(): void
    {
        $modelo = $this->perguntaService->salvarModelo([
            'codigo'          => 'FORM_2026',
            'nome'            => 'Instrumento de Avaliação Anual',
            'vigencia_inicio' => '2026-01-01',
            'grupos'          => [
                'produtividade' => ['nome' => 'Produtividade', 'peso' => 50.0, 'ordem' => 1],
                'etica'         => ['nome' => 'Ética e Disciplina', 'peso' => 50.0, 'ordem' => 2],
            ],
        ]);

        self::assertSame('FORM_2026', $modelo->codigo);
        self::assertSame(1, $modelo->versao);

        // Cria pergunta na escala gráfica de Chiavenato (graus 1 a 5)
        $pergunta = $this->perguntaService->salvarPergunta($modelo, [
            'codigo'          => 'Q1',
            'enunciado'       => 'Capacidade de cumprir prazos nas tarefas do setor.',
            'tipo'            => Pergunta::TIPO_ESCALA_GRAFICA,
            'peso'            => 2.0,
            'grupo_key'       => 'produtividade',
            'ordem'           => 1,
            'obrigatoria'     => true,
            'exige_evidencia' => false,
        ]);

        self::assertSame('Q1', $pergunta->codigo);
        self::assertSame(Pergunta::TIPO_ESCALA_GRAFICA, $pergunta->tipo);
    }

    public function test_validacao_de_regras_condicionais_entre_perguntas(): void
    {
        $modelo = $this->perguntaService->salvarModelo([
            'codigo'          => 'FORM_CONDICIONAL',
            'nome'            => 'Formulário com Pergunta Condicional',
            'vigencia_inicio' => '2026-01-01',
        ]);

        // Pergunta PAI: Sim/Não
        $p1 = $this->perguntaService->salvarPergunta($modelo, [
            'codigo'    => 'P_ATIVIDADE_EXTERNA',
            'enunciado' => 'O servidor realizou fiscalização externa no período?',
            'tipo'      => Pergunta::TIPO_SIM_NAO,
            'grupo_key' => 'geral',
            'ordem'     => 1,
        ]);

        // Pergunta FILHA: Condicional (somente obrigatória se P_ATIVIDADE_EXTERNA == true)
        $p2 = $this->perguntaService->salvarPergunta($modelo, [
            'codigo'              => 'P_RELATORIO_EXTERNO',
            'enunciado'           => 'Apresentou relatórios de fiscalização com conformidade?',
            'tipo'                => Pergunta::TIPO_ESCALA_GRAFICA,
            'grupo_key'           => 'geral',
            'ordem'               => 2,
            'obrigatoria'         => true,
            'regras_condicionais' => [
                'depende_de'     => 'P_ATIVIDADE_EXTERNA',
                'valor_esperado' => true,
            ],
        ]);

        $ciclo = CicloAvaliacao::create([
            'ano_competencia' => 2026,
            'nome'            => 'Ciclo Teste',
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
        ]);

        // CENÁRIO A: Respondeu FALSE para atividade externa. A pergunta filha não deve dar erro por estar vazia.
        $this->perguntaService->validarRespostas(
            $modelo,
            ['P_ATIVIDADE_EXTERNA' => false],
            $ciclo->id,
            10
        );
        $this->assertTrue(true, 'Validação passou com sucesso quando a condição foi ignorada.');

        // CENÁRIO B: Respondeu TRUE para atividade externa, mas NÃO respondeu a pergunta filha obrigatória.
        $this->expectException(ValidationException::class);
        $this->perguntaService->validarRespostas(
            $modelo,
            ['P_ATIVIDADE_EXTERNA' => true],
            $ciclo->id,
            10
        );
    }

    public function test_trava_antileniencia_em_graus_extremos(): void
    {
        $modelo = $this->perguntaService->salvarModelo([
            'codigo'          => 'FORM_TRAVA',
            'nome'            => 'Formulário com Trava',
            'vigencia_inicio' => '2026-01-01',
        ]);

        $p = $this->perguntaService->salvarPergunta($modelo, [
            'codigo'          => 'Q_GRAU',
            'enunciado'       => 'Pontualidade e zelo profissional.',
            'tipo'            => Pergunta::TIPO_ESCALA_GRAFICA,
            'grupo_key'       => 'geral',
            'ordem'           => 1,
            'exige_evidencia' => true, // Exige incidente crítico
        ]);

        $ciclo = CicloAvaliacao::create([
            'ano_competencia' => 2026,
            'nome'            => 'Ciclo Teste',
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
        ]);

        // Tentativa de atribuir grau 5 (extremo) sem qualquer registro no Diário de Bordo
        try {
            $this->perguntaService->validarRespostas(
                $modelo,
                ['Q_GRAU' => 5],
                $ciclo->id,
                999
            );
            $this->fail('Deveria ter lançado ValidationException devido à trava antileniência.');
        } catch (ValidationException $e) {
            $erros = $e->errors();
            self::assertArrayHasKey('respostas.Q_GRAU', $erros);
            self::assertStringContainsString('Trava Antileniência', $erros['respostas.Q_GRAU'][0]);
        }
    }

    public function test_calculo_ponderado_da_nota_final_com_grupos(): void
    {
        $modelo = $this->perguntaService->salvarModelo([
            'codigo'          => 'FORM_CALCULO',
            'nome'            => 'Formulário com Pesos',
            'vigencia_inicio' => '2026-01-01',
            'grupos'          => [
                'grupo_a' => ['nome' => 'Grupo A', 'peso' => 40.0, 'ordem' => 1],
                'grupo_b' => ['nome' => 'Grupo B', 'peso' => 60.0, 'ordem' => 2],
            ],
        ]);

        // Q1 no Grupo A (peso 40%): grau 5 -> nota (5-1)*2.5 = 10.0
        $this->perguntaService->salvarPergunta($modelo, [
            'codigo'    => 'Q1',
            'enunciado' => 'Pergunta 1',
            'tipo'      => Pergunta::TIPO_ESCALA_GRAFICA,
            'peso'      => 1.0,
            'grupo_key' => 'grupo_a',
            'ordem'     => 1,
        ]);

        // Q2 no Grupo B (peso 60%): grau 3 -> nota (3-1)*2.5 = 5.0
        $this->perguntaService->salvarPergunta($modelo, [
            'codigo'    => 'Q2',
            'enunciado' => 'Pergunta 2',
            'tipo'      => Pergunta::TIPO_ESCALA_GRAFICA,
            'peso'      => 1.0,
            'grupo_key' => 'grupo_b',
            'ordem'     => 2,
        ]);

        // Cálculo esperado:
        // Grupo A: 10.0 * 40 = 400
        // Grupo B: 5.0 * 60 = 300
        // Total: 700 / 100 = 7.00
        $resultado = $this->perguntaService->calcularNota($modelo, [
            'Q1' => 5,
            'Q2' => 3,
        ]);

        self::assertSame('7.00', $resultado['nota_final']);
        self::assertTrue($resultado['elegivel_progressao']);
    }

    public function test_endpoint_seed_padrao_gera_modelo_e_perguntas(): void
    {
        $user = User::factory()->create();
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $response = $this->actingAs($user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/modelos-formulario/seed-padrao');

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Modelo de avaliação padrão (Escala Gráfica de Chiavenato F1 a F8) gerado com sucesso.',
        ]);

        $modelo = ModeloFormulario::where('codigo', 'FORM_GERAL_V1')->first();
        self::assertNotNull($modelo);
        self::assertSame('Instrumento de Avaliação de Desempenho - Quadro Geral', $modelo->nome);

        $perguntasCount = Pergunta::where('modelo_id', $modelo->id)->count();
        self::assertSame(8, $perguntasCount);
    }

    public function test_seed_padrao_gera_quatro_grupos_funcionais_e_resolve_modelo_dinamico(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->actingAs($user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson('/api/capd/modelos-formulario/seed-padrao')
            ->assertStatus(200);

        // Verifica os 4 modelos gerados
        $mSeguranca = ModeloFormulario::where('codigo', 'FORM_SEGURANCA_V1')->first();
        $mSaude     = ModeloFormulario::where('codigo', 'FORM_SAUDE_V1')->first();
        $mMagisterio= ModeloFormulario::where('codigo', 'FORM_MAGISTERIO_V1')->first();
        $mGeral     = ModeloFormulario::where('codigo', 'FORM_GERAL_V1')->first();

        self::assertNotNull($mSeguranca, 'Modelo de Segurança Pública deve ser criado.');
        self::assertNotNull($mSaude, 'Modelo de Saúde deve ser criado.');
        self::assertNotNull($mMagisterio, 'Modelo de Magistério deve ser criado.');
        self::assertNotNull($mGeral, 'Modelo de Quadro Geral deve ser criado.');

        // Verifica perguntas de cada modelo
        self::assertGreaterThanOrEqual(7, Pergunta::where('modelo_id', $mSeguranca->id)->count());
        self::assertGreaterThanOrEqual(7, Pergunta::where('modelo_id', $mSaude->id)->count());
        self::assertGreaterThanOrEqual(7, Pergunta::where('modelo_id', $mMagisterio->id)->count());
        self::assertSame(8, Pergunta::where('modelo_id', $mGeral->id)->count());

        // Valida identificação heurística dos grupos funcionais
        $grupoSeguranca = $this->perguntaService->identificarGrupoFuncional(null, 'Guarda Municipal 1ª Classe', 'Secretaria Municipal de Segurança Pública');
        self::assertSame('seguranca', $grupoSeguranca['chave']);
        self::assertSame('FORM_SEGURANCA_V1', $grupoSeguranca['codigo_modelo']);

        $grupoSaude = $this->perguntaService->identificarGrupoFuncional(null, 'Enfermeiro Padrão UBS', 'Secretaria Municipal de Saúde');
        self::assertSame('saude', $grupoSaude['chave']);
        self::assertSame('FORM_SAUDE_V1', $grupoSaude['codigo_modelo']);

        $grupoMagisterio = $this->perguntaService->identificarGrupoFuncional(null, 'Professor de Educação Infantil', 'Escola Municipal Paulo Freire');
        self::assertSame('magisterio', $grupoMagisterio['chave']);
        self::assertSame('FORM_MAGISTERIO_V1', $grupoMagisterio['codigo_modelo']);

        $grupoGeral = $this->perguntaService->identificarGrupoFuncional(null, 'Assistente Administrativo', 'Secretaria Municipal de Finanças');
        self::assertSame('geral', $grupoGeral['chave']);
        self::assertSame('FORM_GERAL_V1', $grupoGeral['codigo_modelo']);

        // Valida resolução dinâmica do modelo
        $modeloResolvidoSeg = $this->perguntaService->resolverModeloParaServidor(null, 'Guarda Municipal');
        self::assertNotNull($modeloResolvidoSeg);
        self::assertSame('FORM_SEGURANCA_V1', $modeloResolvidoSeg->codigo);

        $modeloResolvidoSau = $this->perguntaService->resolverModeloParaServidor(null, 'Médico Clínico Geral');
        self::assertNotNull($modeloResolvidoSau);
        self::assertSame('FORM_SAUDE_V1', $modeloResolvidoSau->codigo);
    }
}


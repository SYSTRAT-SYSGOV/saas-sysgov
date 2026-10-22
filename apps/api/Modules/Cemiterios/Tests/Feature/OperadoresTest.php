<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use Modules\Cemiterios\Tests\Support\RegistroDeTeste;
use App\Models\Tenant;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use Modules\Pessoas\Models\Pessoa;

final class OperadoresTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_busca_do_operador_por_cpf_acha_pela_pessoa_mesmo_sem_a_copia_local(): void
    {
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => '52998224725', 'nome' => 'Operador Da Pessoa']);
        $ligado = RegistroDeTeste::operador(['pessoa_id' => $pessoa->id, 'nome' => 'Operador Da Pessoa', 'tipo' => 'coveiro', 'situacao' => 'ativo']);
        RegistroDeTeste::operador(['nome' => 'Outro Operador', 'tipo' => 'coveiro', 'situacao' => 'ativo']);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)->getJson('/api/cemiterios/operadores?q=529.982.247-25');

        $resposta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ligado->id);
        $this->como($this->admin($this->tenant), $this->tenant)->getJson('/api/cemiterios/operadores?q=111.444.777-35')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_cadastro_e_listagem_de_coveiros_e_pedreiros(): void
    {
        $admin = $this->admin($this->tenant);

        // 1. Cadastrar coveiro municipal
        $respCov = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'Sebastião Coveiro',
            'tipo' => 'coveiro',
            'matricula_funcional' => 'MAT-9901',
            'telefone' => '41988887777',
        ]);
        $respCov->assertCreated()->assertJsonPath('nome', 'Sebastião Coveiro');
        $coveiroId = (int) $respCov->json('id');

        // 2. Cadastrar pedreiro credenciado com alvará
        $respPed = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'Antônio Pedreiro Obras',
            'tipo' => 'pedreiro',
            'alvara_numero' => 'ALV-2026/01',
            'alvara_validade' => today()->addMonths(6)->toDateString(),
            'telefone' => '41977776666',
        ]);
        $respPed->assertCreated()->assertJsonPath('tipo', 'pedreiro');
        $pedreiroId = (int) $respPed->json('id');

        // 3. Cadastrar pedreiro com alvará vencido
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'José Pedreiro Vencido',
            'tipo' => 'pedreiro',
            'alvara_numero' => 'ALV-2024/99',
            'alvara_validade' => today()->subMonth()->toDateString(),
        ])->assertCreated();

        // 4. Listagem geral e estatísticas
        $respList = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores');
        $respList->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonPath('stats.total_coveiros', 1)
            ->assertJsonPath('stats.total_pedreiros', 2)
            ->assertJsonPath('stats.alvaras_vencidos', 1);

        // 5. Filtro por alvará vencido
        $respVenc = $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores?status_alvara=vencido');
        $respVenc->assertOk()->assertJsonPath('total', 1);

        // 6. Consultar operador individual
        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$pedreiroId}")
            ->assertOk()
            ->assertJsonPath('status_alvara', 'valido');
    }

    public function test_historico_operacional_vinculado(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);

        $coveiro = RegistroDeTeste::operador([
            'nome' => 'Carlos Pereira',
            'tipo' => 'coveiro',
            'matricula_funcional' => 'MAT-7700',
            'situacao' => 'ativo',
        ]);

        $falecido = Falecido::create([
            'nome' => 'Falecido Teste Operador',
            'falecimento' => '2026-05-10',
        ]);

        Inumacao::create([
            'deceased_id' => $falecido->id,
            'plot_id' => $jazigo->id,
            'sepultado_em' => '2026-05-10 14:00:00',
            'carencia_desde' => '2026-05-10',
            'origem' => 'historico',
            'coveiro_nome' => 'Carlos Pereira',
            'situacao' => 'confirmada',
        ]);

        $respHist = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$coveiro->id}/historico");
        $respHist->assertOk()
            ->assertJsonPath('total_operacoes', 1)
            ->assertJsonPath('operacoes.0.falecido.nome', 'Falecido Teste Operador');
    }

    public function test_filtro_por_necropole(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);
        $parkId = $jazigo->park_id;

        $opDaNecropole = RegistroDeTeste::operador(['nome' => 'Lotado na Necrópole', 'tipo' => 'coveiro', 'park_id' => $parkId]);
        RegistroDeTeste::operador(['nome' => 'Sem Necrópole Fixa', 'tipo' => 'coveiro']);

        $resp = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores?park_id={$parkId}");
        $resp->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $opDaNecropole->id);
    }

    public function test_credenciamento_gera_historico_e_atualiza_credencial_vigente(): void
    {
        $admin = $this->admin($this->tenant);
        $pedreiro = RegistroDeTeste::operador(['nome' => 'Pedreiro Credenciado', 'tipo' => 'pedreiro']);

        $resp = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/operadores/{$pedreiro->id}/licencas", [
            'numero' => 'ALV-2026/500',
            'validade' => today()->addYear()->toDateString(),
        ]);
        $resp->assertCreated()->assertJsonPath('numero', 'ALV-2026/500');

        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$pedreiro->id}/licencas")
            ->assertOk()->assertJsonCount(1);

        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$pedreiro->id}")
            ->assertOk()->assertJsonPath('alvara_numero', 'ALV-2026/500');
    }

    public function test_sancao_registra_historico_e_bloqueia_nova_vinculacao(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo();
        $coveiro = RegistroDeTeste::operador(['nome' => 'Coveiro Suspenso', 'tipo' => 'coveiro']);

        $resp = $this->como($admin, $this->tenant)->postJson("/api/cemiterios/operadores/{$coveiro->id}/penalidades", [
            'tipo' => 'suspensao',
            'inicio' => today()->toDateString(),
            'fim' => today()->addDays(10)->toDateString(),
            'motivo' => 'Descumprimento de norma de segurança.',
        ]);
        $resp->assertCreated()->assertJsonPath('tipo', 'suspensao');

        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$coveiro->id}/penalidades")
            ->assertOk()->assertJsonCount(1);

        $resp422 = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/inumacoes', [
            'falecido' => ['nome' => 'Falecido Bloqueio', 'falecimento' => '2026-05-10', 'certidao_numero' => 'CERT-1', 'certidao_cartorio' => 'Cartório X'],
            'certidao_arquivo' => \Illuminate\Http\UploadedFile::fake()->create('certidao.pdf', 100),
            'plot_id' => $jazigo->id,
            'sepultado_em' => '2026-05-10 10:00:00',
            'coveiro_id' => $coveiro->id,
        ]);
        $resp422->assertStatus(422)->assertJsonPath('code', 'operador.suspenso');
    }

    public function test_historico_prioriza_vinculo_por_id_e_mantem_fallback_por_nome(): void
    {
        $admin = $this->admin($this->tenant);
        $jazigo = $this->novoJazigo(concedido: false);

        $coveiro = RegistroDeTeste::operador(['nome' => 'Coveiro Vinculado', 'tipo' => 'coveiro', 'matricula_funcional' => 'MAT-01']);

        $falecidoNovo = Falecido::create(['nome' => 'Falecido Novo', 'falecimento' => '2026-06-01']);
        Inumacao::create([
            'deceased_id' => $falecidoNovo->id, 'plot_id' => $jazigo->id, 'sepultado_em' => '2026-06-01 10:00:00',
            'carencia_desde' => '2026-06-01', 'origem' => 'historico', 'coveiro_id' => $coveiro->id, 'coveiro_nome' => 'Nome Divergente no Registro',
            'situacao' => 'confirmada',
        ]);

        $falecidoLegado = Falecido::create(['nome' => 'Falecido Legado', 'falecimento' => '2020-01-01']);
        Inumacao::create([
            'deceased_id' => $falecidoLegado->id, 'plot_id' => $jazigo->id, 'sepultado_em' => '2020-01-01 10:00:00',
            'carencia_desde' => '2020-01-01', 'origem' => 'historico', 'coveiro_nome' => 'Coveiro Vinculado',
            'situacao' => 'confirmada',
        ]);

        $resp = $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$coveiro->id}/historico");
        $resp->assertOk()->assertJsonPath('total_operacoes', 2);
    }

    public function test_permissao_view_lista_mas_nao_gerencia_e_sem_permissao_recebe_403(): void
    {
        $somenteLeitura = $this->usuario($this->tenant, ['cemiterios.cadastros.view']);
        $semAcesso = $this->usuario($this->tenant, []);

        $this->como($somenteLeitura, $this->tenant)->getJson('/api/cemiterios/operadores')->assertOk();
        $this->como($somenteLeitura, $this->tenant)->postJson('/api/cemiterios/operadores', ['nome' => 'X', 'tipo' => 'coveiro'])
            ->assertForbidden();

        $this->como($semAcesso, $this->tenant)->getJson('/api/cemiterios/operadores')->assertForbidden();
    }

    public function test_documento_nunca_aparece_em_texto_puro_e_busca_por_hash_funciona(): void
    {
        $admin = $this->admin($this->tenant);

        $resp = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'nome' => 'Operador Documentado',
            'tipo' => 'coveiro',
            'cpf_cnpj' => '529.982.247-25',
        ]);
        $resp->assertCreated()->assertJsonMissingPath('cpf_cnpj');
        $id = (int) $resp->json('id');

        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores')
            ->assertOk()->assertJsonMissing(['cpf_cnpj' => '529.982.247-25'])
            ->assertJsonPath('data.0.documento_mascarado', '***.982.247-**');

        $this->como($admin, $this->tenant)->getJson("/api/cemiterios/operadores/{$id}")
            ->assertOk()->assertJsonMissingPath('cpf_cnpj')->assertJsonPath('documento_mascarado', '***.982.247-**');

        // Busca pelo documento completo continua localizando o registro correto (via documento_hash).
        $this->como($admin, $this->tenant)->getJson('/api/cemiterios/operadores?q=' . urlencode('529.982.247-25'))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $id);

        // O documento mora na pessoa do cadastro central: o operador não tem mais a coluna e aponta para ela.
        self::assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('cemetery_operators', 'cpf_cnpj'));
        $pessoa = Pessoa::query()->where('documento_hash', \Modules\Pessoas\Support\Documento::hash('52998224725'))->sole();
        self::assertSame($pessoa->id, OperadorCemiterio::query()->findOrFail($id)->pessoa_id);

        // Documento que não é CPF nem CNPJ válido é recusado, em vez de gravado como texto.
        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', ['nome' => 'Doc Ruim', 'tipo' => 'coveiro', 'cpf_cnpj' => '111.222.333-44'])
            ->assertStatus(422)->assertJsonValidationErrors('cpf_cnpj');
    }

    public function test_isolamento_multi_tenant_operadores(): void
    {
        $adminA = $this->admin($this->tenant);
        $tenantB = $this->criarTenant('pref-b');
        $adminB = $this->admin($tenantB);

        $opA = RegistroDeTeste::operador([
            'nome' => 'Operador A',
            'tipo' => 'coveiro',
            'situacao' => 'ativo',
        ]);

        // Tenant B não enxerga operador do Tenant A
        $this->como($adminB, $tenantB)->getJson('/api/cemiterios/operadores')
            ->assertOk()
            ->assertJsonPath('total', 0);

        $this->como($adminB, $tenantB)->getJson("/api/cemiterios/operadores/{$opA->id}")
            ->assertNotFound();
    }

    public function test_vinculo_de_operador_com_pessoa_do_cadastro_unico(): void
    {
        $pessoa = \Modules\Pessoas\Models\Pessoa::create([
            'nome' => 'Carlos Coveiro da Silva',
            'cpf' => '52998224725',
        ]);

        $admin = $this->admin($this->tenant);

        $resp = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/operadores', [
            'pessoa_id' => $pessoa->id,
            'nome' => 'Carlos Coveiro da Silva',
            'tipo' => 'coveiro',
            'matricula_funcional' => 'MAT-COV-10',
        ]);

        $resp->assertCreated();
        $operadorId = (int) $resp->json('id');

        $operador = OperadorCemiterio::findOrFail($operadorId);
        self::assertSame($pessoa->id, $operador->pessoa_id);
        self::assertInstanceOf(\Modules\Pessoas\Models\Pessoa::class, $operador->pessoa);
        self::assertSame('Carlos Coveiro da Silva', $operador->pessoa->nome);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Enums\StatusTr;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\CampoConfiguracaoService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Services\TrService;
use Modules\Licita\Tests\TestCase;

final class TrWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function criarProcesso(User $elaborador): Processo
    {
        return app(ProcessoService::class)->criar(['objeto' => null], $elaborador);
    }

    /**
     * @return array<string, mixed>
     */
    private function dadosDfd(): array
    {
        return [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de contratação de serviço continuado de limpeza.',
            'objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.',
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ],
            'itens' => [
                [
                    'tipo' => 'servico',
                    'codigo' => '12345',
                    'descricao' => 'Serviço de limpeza predial',
                    'unidade_medida' => 'mês',
                    'quantidade' => 12,
                    'valor_unitario' => 5000,
                ],
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function dadosRiscos(): array
    {
        return [
            [
                'descricao' => 'Apresentação de documentação irregular pelo fornecedor.',
                'fase' => 'selecao_fornecedor',
                'probabilidade' => 2,
                'impacto' => 4,
                'alocacao' => 'contratada',
            ],
        ];
    }

    /**
     * @return array{0: Tenant, 1: User, 2: User}
     */
    private function setUpTenantEUsuarios(): array
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $elaborador = User::create(['name' => 'Elaborador', 'email' => 'elaborador@teste.gov.br', 'password' => bcrypt('secret')]);
        $aprovador = User::create(['name' => 'Aprovador', 'email' => 'aprovador@teste.gov.br', 'password' => bcrypt('secret')]);

        return [$tenant, $elaborador, $aprovador];
    }

    /**
     * DFD aprovado + ETP + Mapa de Riscos + Pesquisa de Preços criados
     * (pré-requisito do TR) — devolve o processo pronto para iniciá-lo.
     */
    private function processoComPesquisaPreco(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $elaborador);
        app(PesquisaPrecoService::class)->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $elaborador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_tr_sem_pesquisa_de_precos(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre a Pesquisa de Preços');
        app(TrService::class)->criar($processo, [], $elaborador);
    }

    public function test_tr_nasce_com_a_equipe_copiada_da_pesquisa_de_precos(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        $tr = app(TrService::class)->criar($processo, [], $elaborador);

        self::assertSame($processo->pesquisaPreco->equipe_planejamento, $tr->equipe_planejamento);
        self::assertSame(StatusTr::Rascunho->value, $tr->status);
    }

    public function test_tr_continua_editavel_a_qualquer_momento(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        $service = app(TrService::class);
        $tr = $service->criar($processo, [], $elaborador);

        $tr = $service->atualizar($tr, [
            'fundamentacao_contratacao' => 'Fundamentação inicial.',
            'criterio_julgamento' => 'menor_preco',
        ], $elaborador);
        self::assertSame('Fundamentação inicial.', $tr->fundamentacao_contratacao);
        self::assertSame('menor_preco', $tr->criterio_julgamento);
        self::assertSame(StatusTr::Rascunho->value, $tr->status);

        $tr = $service->atualizar($tr, ['fundamentacao_contratacao' => 'Fundamentação revisada após nova análise técnica.'], $elaborador);
        self::assertSame('Fundamentação revisada após nova análise técnica.', $tr->fundamentacao_contratacao);
        self::assertCount(3, $tr->versoes);
    }

    public function test_tr_aprovado_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        $service = app(TrService::class);
        $tr = $service->criar($processo, [], $elaborador);
        $tr->update(['status' => StatusTr::Aprovado->value]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $service->atualizar($tr, ['fundamentacao_contratacao' => 'Tentativa pós-aprovação'], $elaborador);
    }

    public function test_nao_permite_criar_segundo_tr_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        $service = app(TrService::class);
        $service->criar($processo, [], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui um Termo de Referência');
        $service->criar($processo->fresh(), [], $elaborador);
    }

    /**
     * O órgão pode reorganizar as seções nativas do TR como se fossem
     * campos extras: renomear o rótulo, mover para outra aba e marcar como
     * obrigatória — sem alterar o schema do banco (ver
     * CampoConfiguracaoService::CAMPOS_NATIVOS/getConfigMesclada).
     */
    public function test_org_pode_renomear_reordenar_e_marcar_secao_nativa_do_tr_como_obrigatoria(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();

        app(CampoConfiguracaoService::class)->salvar('tr', [
            [
                'key' => 'fundamentacao_contratacao',
                'label' => 'Justificativa da Contratação (nome do órgão)',
                'tipo' => 'texto_longo', // ignorado pelo backend: tipo de campo nativo é fixo pelo registro.
                'obrigatorio' => true,
                'ordem' => 5,
                'aba' => 'Justificativa',
            ],
        ]);

        $mesclada = app(CampoConfiguracaoService::class)->getConfigMesclada('tr');
        $fundamentacao = collect($mesclada)->firstWhere('key', 'fundamentacao_contratacao');

        self::assertNotNull($fundamentacao);
        self::assertTrue($fundamentacao['nativo']);
        self::assertSame('Justificativa da Contratação (nome do órgão)', $fundamentacao['label']);
        self::assertSame('Justificativa', $fundamentacao['aba']);
        self::assertSame(5, $fundamentacao['ordem']);
        self::assertTrue($fundamentacao['obrigatorio']);
        // `tipo` continua o nativo do registro (texto_longo aqui é coincidência —
        // o ponto é que o backend nunca aceita o cliente sobrescrever esse valor).
        self::assertSame('texto_longo', $fundamentacao['tipo']);

        // Outras seções nativas não tocadas continuam com os defaults de fábrica.
        $descricao = collect($mesclada)->firstWhere('key', 'descricao_solucao');
        self::assertFalse($descricao['obrigatorio']);
        self::assertNull($descricao['aba']);
    }

    public function test_cria_tr_falha_quando_secao_nativa_obrigatoria_configurada_esta_vazia(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        app(CampoConfiguracaoService::class)->salvar('tr', [
            ['key' => 'fundamentacao_contratacao', 'label' => 'Fundamentação da Contratação', 'tipo' => 'texto_longo', 'obrigatorio' => true, 'ordem' => 0],
        ]);

        try {
            app(TrService::class)->criar($processo, [], $elaborador);
            self::fail('Deveria ter lançado ValidationException pela seção nativa obrigatória vazia.');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('fundamentacao_contratacao', $e->errors());
        }
    }

    public function test_atualiza_tr_falha_quando_secao_nativa_obrigatoria_configurada_fica_vazia(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComPesquisaPreco($elaborador, $aprovador);

        $tr = app(TrService::class)->criar($processo, ['fundamentacao_contratacao' => 'Justificativa inicial.'], $elaborador);

        app(CampoConfiguracaoService::class)->salvar('tr', [
            ['key' => 'fundamentacao_contratacao', 'label' => 'Fundamentação da Contratação', 'tipo' => 'texto_longo', 'obrigatorio' => true, 'ordem' => 0],
        ]);

        try {
            app(TrService::class)->atualizar($tr, ['fundamentacao_contratacao' => ''], $elaborador);
            self::fail('Deveria ter lançado ValidationException pela seção nativa obrigatória esvaziada.');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('fundamentacao_contratacao', $e->errors());
        }

        // Não mexer no campo continua passando — obrigatoriedade só barra quando o valor final fica vazio.
        $tr = app(TrService::class)->atualizar($tr, ['descricao_solucao' => 'Descrição da solução.'], $elaborador);
        self::assertSame('Justificativa inicial.', $tr->fundamentacao_contratacao);
    }
}

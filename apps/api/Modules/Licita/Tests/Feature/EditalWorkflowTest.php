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
use Modules\Licita\Enums\StatusEdital;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\CampoConfiguracaoService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EditalService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Services\TrService;
use Modules\Licita\Tests\TestCase;

final class EditalWorkflowTest extends TestCase
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
     * DFD aprovado + ETP + Mapa de Riscos + Pesquisa de Preços + TR criados
     * (pré-requisito do Edital) — devolve o processo pronto para iniciá-lo.
     */
    private function processoComTr(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => [
            ['descricao' => 'Atraso na entrega.', 'fase' => 'execucao_contratual', 'probabilidade' => 2, 'impacto' => 3, 'alocacao' => 'contratada'],
        ]], $elaborador);
        app(PesquisaPrecoService::class)->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $elaborador);
        app(TrService::class)->criar($processo->fresh(), [
            'criterio_julgamento' => 'menor_preco',
            'sancoes_administrativas' => 'Multa de 10% sobre o valor do contrato em caso de inexecução.',
        ], $elaborador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_edital_sem_tr(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre o Termo de Referência');
        app(EditalService::class)->criar($processo, [], $elaborador);
    }

    public function test_edital_nasce_com_objeto_criterio_julgamento_e_sancoes_copiados_do_dfd_e_tr(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        $edital = app(EditalService::class)->criar($processo, [], $elaborador);

        self::assertSame($processo->dfd->objeto, $edital->objeto);
        self::assertSame($processo->tr->criterio_julgamento, $edital->criterio_julgamento);
        self::assertSame($processo->tr->sancoes_administrativas, $edital->sancoes_administrativas);
        self::assertSame($processo->tr->equipe_planejamento, $edital->equipe_planejamento);
        self::assertSame(StatusEdital::Rascunho->value, $edital->status);
    }

    public function test_dados_informados_no_request_nao_sao_sobrescritos_pela_copia(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        $edital = app(EditalService::class)->criar($processo, [
            'objeto' => 'Objeto redigido manualmente para o edital.',
            'criterio_julgamento' => 'maior_desconto',
        ], $elaborador);

        self::assertSame('Objeto redigido manualmente para o edital.', $edital->objeto);
        self::assertSame('maior_desconto', $edital->criterio_julgamento);
        // Sanções continuam copiadas do TR, já que não foram informadas.
        self::assertSame($processo->tr->sancoes_administrativas, $edital->sancoes_administrativas);
    }

    public function test_edital_continua_editavel_a_qualquer_momento(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        $service = app(EditalService::class);
        $edital = $service->criar($processo, [], $elaborador);

        $edital = $service->atualizar($edital, ['preambulo' => 'Preâmbulo inicial.'], $elaborador);
        self::assertSame('Preâmbulo inicial.', $edital->preambulo);
        self::assertSame(StatusEdital::Rascunho->value, $edital->status);

        $edital = $service->atualizar($edital, ['preambulo' => 'Preâmbulo revisado.'], $elaborador);
        self::assertSame('Preâmbulo revisado.', $edital->preambulo);
        self::assertCount(3, $edital->versoes);
    }

    public function test_edital_aprovado_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        $service = app(EditalService::class);
        $edital = $service->criar($processo, [], $elaborador);
        $edital->update(['status' => StatusEdital::Aprovado->value]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $service->atualizar($edital, ['preambulo' => 'Tentativa pós-aprovação'], $elaborador);
    }

    public function test_nao_permite_criar_segundo_edital_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        $service = app(EditalService::class);
        $service->criar($processo, [], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui um Edital');
        $service->criar($processo->fresh(), [], $elaborador);
    }

    /**
     * O Edital nasce com nenhuma seção obrigatória (mesmo espírito do TR) —
     * o órgão que quiser exigir alguma seção precisa configurar
     * explicitamente, ao contrário do DFD/ETP (que já eram obrigatórios de
     * fábrica antes de virarem configuráveis).
     */
    public function test_edital_nasce_sem_nenhuma_secao_obrigatoria_por_padrao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        // Não deve lançar ValidationException mesmo com tudo vazio. Objeto/
        // critério de julgamento/sanções nascem copiados do DFD/TR (ver
        // teste dedicado a essa cópia acima) — aqui checamos só as seções
        // que genuinamente não têm fonte de cópia e por isso nascem vazias.
        $edital = app(EditalService::class)->criar($processo, [], $elaborador);

        self::assertNull($edital->condicoes_participacao);
        self::assertNull($edital->requisitos_habilitacao);
        self::assertNull($edital->procedimento_sessao_publica);
        self::assertNull($edital->prazo_recursal);
        self::assertNull($edital->disposicoes_gerais);
    }

    public function test_org_pode_marcar_secao_nativa_do_edital_como_obrigatoria(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComTr($elaborador, $aprovador);

        app(CampoConfiguracaoService::class)->salvar('edital', [
            ['key' => 'preambulo', 'label' => 'Preâmbulo do Edital', 'tipo' => 'texto_longo', 'obrigatorio' => true, 'ordem' => 0, 'aba' => 'Abertura'],
        ]);

        $mesclada = app(CampoConfiguracaoService::class)->getConfigMesclada('edital');
        $preambulo = collect($mesclada)->firstWhere('key', 'preambulo');
        self::assertTrue($preambulo['nativo']);
        self::assertSame('Preâmbulo do Edital', $preambulo['label']);
        self::assertSame('Abertura', $preambulo['aba']);
        self::assertTrue($preambulo['obrigatorio']);

        try {
            app(EditalService::class)->criar($processo, [], $elaborador);
            self::fail('Deveria ter lançado ValidationException pelo preâmbulo obrigatório vazio.');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('preambulo', $e->errors());
        }

        $edital = app(EditalService::class)->criar($processo, ['preambulo' => 'Edital de Pregão Eletrônico nº 001/2026.'], $elaborador);
        self::assertSame('Edital de Pregão Eletrônico nº 001/2026.', $edital->preambulo);
    }
}

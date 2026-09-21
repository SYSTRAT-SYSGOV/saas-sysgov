<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Enums\StatusDfd;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\CampoConfiguracaoService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

final class DfdWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function criarProcesso(User $elaborador): Processo
    {
        // Número e ano são gerados automaticamente pelo serviço.
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
            'previsao_pca' => true,
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
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

    public function test_fluxo_completo_de_aprovacao_avanca_processo_para_em_elaboracao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        self::assertSame(StatusDfd::Rascunho->value, $dfd->status);
        self::assertSame(1, $dfd->versoes()->count());

        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        self::assertSame(StatusDfd::EmRevisao->value, $dfd->status);

        $dfd = $dfdService->aprovar($dfd, $aprovador, 'De acordo.');
        self::assertSame(StatusDfd::Aprovado->value, $dfd->status);
        self::assertSame($aprovador->id, $dfd->aprovado_por);
        self::assertNotNull($dfd->aprovado_em);

        self::assertSame(FaseLicita::EmElaboracao->value, $processo->fresh()->fase_atual);
    }

    public function test_elaborador_nao_pode_aprovar_o_proprio_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $dfdService->aprovar($dfd, $elaborador);
    }

    public function test_nao_permite_aprovar_dfd_ainda_em_rascunho(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Transição inválida');
        $dfdService->aprovar($dfd, $aprovador);
    }

    public function test_dfd_aprovado_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->aprovar($dfd, $aprovador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $dfdService->atualizar($dfd, ['objeto' => 'Tentativa de alteração pós-aprovação'], $elaborador);
    }

    public function test_dfd_rejeitado_pode_ser_reaberto_editado_e_reenviado_ate_aprovar(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->rejeitar($dfd, $aprovador, 'Faltou detalhar o valor estimado.');
        self::assertSame(StatusDfd::Rejeitado, $dfd->statusEnum());

        // Sem reabrir, não há como voltar direto pra revisão (RN-002).
        try {
            $dfdService->enviarParaRevisao($dfd, $elaborador);
            self::fail('Deveria ter lançado DomainException ao tentar enviar direto de rejeitado para revisão.');
        } catch (DomainException $e) {
            self::assertStringContainsString('Transição inválida', $e->getMessage());
        }

        $dfd = $dfdService->reabrir($dfd, $elaborador);
        self::assertSame(StatusDfd::Rascunho, $dfd->statusEnum());

        $dfd = $dfdService->atualizar($dfd, ['objeto' => 'Objeto complementado após reabertura.'], $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->aprovar($dfd, $aprovador);

        self::assertSame(StatusDfd::Aprovado, $dfd->statusEnum());
        self::assertSame('reaberto', $dfd->versoes()->orderBy('versao')->skip(3)->first()->acao);
    }

    public function test_reabrir_so_permitido_quando_status_e_rejeitado(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Transição inválida');
        $dfdService->reabrir($dfd, $elaborador);
    }

    public function test_itens_de_material_e_servico_sao_persistidos_no_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dados = $this->dadosDfd();
        $dados['itens'] = [
            [
                'tipo' => 'material',
                'codigo' => '123456',
                'descricao' => 'Papel A4 75g/m²',
                'unidade_medida' => 'Resma',
                'quantidade' => 100,
                'valor_unitario' => 25.9,
            ],
            [
                'tipo' => 'servico',
                'codigo' => '654321',
                'descricao' => 'Manutenção preventiva de ar-condicionado',
                'unidade_medida' => 'Serviço',
                'quantidade' => 12,
                'valor_unitario' => 350,
            ],
        ];

        $dfd = $dfdService->criar($processo, $dados, $elaborador);

        self::assertCount(2, $dfd->itens);
        self::assertSame('material', $dfd->itens[0]['tipo']);
        self::assertSame('123456', $dfd->itens[0]['codigo']);
        self::assertSame('servico', $dfd->itens[1]['tipo']);

        $dfd->refresh();
        self::assertCount(2, $dfd->itens);
    }

    public function test_campos_extras_de_item_sao_validados_contra_configuracao_do_proprio_tipo(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        app(CampoConfiguracaoService::class)->salvar('dfd_item_material', [
            ['key' => 'marca_referencia', 'label' => 'Marca de Referência', 'tipo' => 'texto', 'obrigatorio' => true, 'ordem' => 0],
        ]);

        $dfdService = app(DfdService::class);
        $dados = $this->dadosDfd();
        $dados['itens'] = [
            [
                'tipo' => 'material',
                'codigo' => '123456',
                'descricao' => 'Papel A4 75g/m²',
                'unidade_medida' => 'Resma',
                'quantidade' => 100,
                'valor_unitario' => 25.9,
                // Falta o campo_extra "marca_referencia", obrigatório para material.
            ],
        ];

        // ValidationException (não DomainException): campo extra obrigatório
        // vazio é erro de VALIDAÇÃO DE FORMULÁRIO, no mesmo formato usado
        // pelos campos fixos — ver comentário em
        // CampoConfiguracaoService::validarRespostas.
        try {
            $dfdService->criar($processo, $dados, $elaborador);
            self::fail('Deveria ter lançado ValidationException por falta do campo extra obrigatório.');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('campos_extras.marca_referencia', $e->errors());
        }
    }

    public function test_aprovador_pode_alterar_equipe_de_planejamento_do_dfd_em_revisao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);

        $novaEquipe = [
            ['nome' => 'Beltrano', 'cargo' => 'Gestor', 'matricula' => '999'],
            ['nome' => 'Ciclana', 'cargo' => 'Fiscal Técnico', 'matricula' => '998'],
        ];
        $dfd = $dfdService->alterarEquipePlanejamento($dfd, $aprovador, $novaEquipe);

        self::assertSame($novaEquipe, $dfd->equipe_planejamento);
        // Ação própria no histórico — não deve se confundir com uma edição
        // comum do elaborador ("revisado").
        // versoes() já vem com orderBy('versao') embutido no relacionamento
        // (ver Dfd::versoes()) — reorder() troca em vez de empilhar, senão
        // o ORDER BY duplicado (asc + desc) faz o banco priorizar o primeiro.
        self::assertSame('equipe_alterada_pelo_aprovador', $dfd->versoes()->reorder('versao', 'desc')->first()->acao);
    }

    public function test_elaborador_nao_pode_alterar_equipe_de_planejamento_via_metodo_do_aprovador(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $dfdService->alterarEquipePlanejamento($dfd, $elaborador, [
            ['nome' => 'Beltrano', 'cargo' => 'Gestor', 'matricula' => '999'],
            ['nome' => 'Ciclana', 'cargo' => 'Fiscal Técnico', 'matricula' => '998'],
        ]);
    }

    public function test_nao_permite_alterar_equipe_de_planejamento_fora_da_revisao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('em revisão');
        $dfdService->alterarEquipePlanejamento($dfd, $aprovador, [
            ['nome' => 'Beltrano', 'cargo' => 'Gestor', 'matricula' => '999'],
            ['nome' => 'Ciclana', 'cargo' => 'Fiscal Técnico', 'matricula' => '998'],
        ]);
    }

    public function test_versionamento_incrementa_a_cada_transicao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        self::assertSame(1, $dfd->versoes()->count());

        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        self::assertSame(2, $dfd->versoes()->count());

        $dfd = $dfdService->aprovar($dfd, $aprovador);
        self::assertSame(3, $dfd->versoes()->count());
        self::assertSame([1, 2, 3], $dfd->versoes()->pluck('versao')->all());
    }

    /**
     * Objeto/Justificativa/Data Prevista/Grau de Prioridade sempre foram
     * obrigatórios antes de virarem seções nativas configuráveis (ver
     * CampoConfiguracaoService::CAMPOS_NATIVOS) — `obrigatorio_padrao=true`
     * garante que essa migração não afrouxa o comportamento pra quem nunca
     * reconfigurou o DFD.
     */
    public function test_cria_dfd_falha_por_padrao_quando_objeto_esta_vazio(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dados = $this->dadosDfd();
        unset($dados['objeto']);

        try {
            app(DfdService::class)->criar($processo, $dados, $elaborador);
            self::fail('Deveria ter lançado ValidationException pelo objeto obrigatório vazio (obrigatorio_padrao).');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('objeto', $e->errors());
        }
    }

    /**
     * O órgão pode desligar a obrigatoriedade de fábrica de uma seção
     * nativa do DFD — aqui, a Área Requisitante (já opcional hoje) e o
     * Objeto (obrigatório hoje) tratados de formas diferentes: um nasce
     * livre, o outro precisa ser desligado explicitamente.
     */
    public function test_org_pode_desligar_obrigatoriedade_padrao_do_objeto_do_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        app(CampoConfiguracaoService::class)->salvar('dfd', [
            ['key' => 'objeto', 'label' => 'Objeto', 'tipo' => 'texto', 'obrigatorio' => false, 'ordem' => 0],
        ]);

        $dados = $this->dadosDfd();
        unset($dados['objeto']);
        $dfd = app(DfdService::class)->criar($processo, $dados, $elaborador);

        self::assertNull($dfd->objeto);
        self::assertSame(StatusDfd::Rascunho->value, $dfd->status);
    }

    /**
     * O órgão pode renomear e mover a seção nativa "justificativa" do DFD
     * pra uma aba própria — mesmo mecanismo já usado por TR e ETP. A
     * equipe de planejamento não entra nesse mapa (ver comentário no
     * registro de campos nativos), então continua com o rótulo/obrigação
     * padrão mesmo depois de configurar outros campos.
     */
    public function test_org_pode_renomear_e_mover_secao_nativa_do_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();

        app(CampoConfiguracaoService::class)->salvar('dfd', [
            ['key' => 'justificativa', 'label' => 'Justificativa Técnica e Econômica', 'tipo' => 'texto_longo', 'obrigatorio' => true, 'ordem' => 2, 'aba' => 'Fundamentação'],
        ]);

        $mesclada = app(CampoConfiguracaoService::class)->getConfigMesclada('dfd');
        $justificativa = collect($mesclada)->firstWhere('key', 'justificativa');

        self::assertNotNull($justificativa);
        self::assertTrue($justificativa['nativo']);
        self::assertSame('Justificativa Técnica e Econômica', $justificativa['label']);
        self::assertSame('Fundamentação', $justificativa['aba']);
        self::assertSame('texto_longo', $justificativa['tipo']);

        // equipe_planejamento/itens não fazem parte do mapa de campos nativos.
        self::assertNull(collect($mesclada)->firstWhere('key', 'equipe_planejamento'));
        self::assertNull(collect($mesclada)->firstWhere('key', 'itens'));

        $areaRequisitante = collect($mesclada)->firstWhere('key', 'area_requisitante');
        self::assertFalse($areaRequisitante['obrigatorio']);
    }

    public function test_atualiza_dfd_falha_quando_justificativa_obrigatoria_fica_vazia(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfd = app(DfdService::class)->criar($processo, $this->dadosDfd(), $elaborador);

        try {
            app(DfdService::class)->atualizar($dfd, ['justificativa' => ''], $elaborador);
            self::fail('Deveria ter lançado ValidationException pela justificativa obrigatória esvaziada.');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('justificativa', $e->errors());
        }

        // Não mexer no campo continua passando.
        $dfd = app(DfdService::class)->atualizar($dfd, ['area_requisitante' => 'Secretaria de Obras'], $elaborador);
        self::assertSame($this->dadosDfd()['justificativa'], $dfd->justificativa);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Licita\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\AprovacaoFinalService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EditalService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Services\TrService;

/**
 * Dados de demonstração do Licita — 8 processos, um em cada ponto do fluxo
 * (DFD rascunho/em revisão/rejeitado, planejamento em andamento, aguardando
 * o Ordenador, aprovação final rejeitada e concluído).
 *
 * Tudo passa pelos Services do módulo (não por insert direto), então as
 * versões, a auditoria, o outbox e as RNs (segregação de funções, mínimo de
 * cotações etc.) valem exatamente como no uso real. Elaborador e aprovador
 * são usuários distintos por causa da RN-005.
 *
 * Uso: php artisan db:seed --class='Modules\Licita\Database\Seeders\LicitaDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver processos do Licita (evita duplicar).
 */
final class LicitaDadosDemonstracaoSeeder extends Seeder
{
    private User $elaborador;

    private User $aprovador;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Licita.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (Processo::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem processos do Licita — nada a fazer.");
            return;
        }

        $usuarios = $tenant->users()->orderBy('users.id')->limit(2)->get();
        [$elaborador, $aprovador] = [$usuarios->get(0), $usuarios->get(1)];
        if (!$elaborador instanceof User || !$aprovador instanceof User) {
            $this->informar('O Licita exige dois usuários distintos no tenant (elaborador e aprovador — RN-005).', aviso: true);
            return;
        }
        [$this->elaborador, $this->aprovador] = [$elaborador, $aprovador];

        $this->processoMaterialExpediente();
        $this->processoLimpezaPredial();
        $this->processoMerendaEscolar();
        $this->processoManutencaoFrota();
        $this->processoComputadores();
        $this->processoUniformesEscolares();
        $this->processoMedicamentos();
        $this->processoIluminacaoLed();

        $this->informar("8 processos de demonstração do Licita criados no tenant [{$tenant->id}] {$tenant->name}.");
    }

    // ---------------------------------------------------------------- cenários

    private function processoMaterialExpediente(): void
    {
        $processo = $this->novoProcesso('Aquisição de material de expediente');

        $this->como($this->elaborador, fn () => app(DfdService::class)->criar($processo, $this->dadosDfd(
            objeto: 'Aquisição de material de expediente para as secretarias municipais',
            area: 'Secretaria Municipal de Administração',
            prioridade: 'media',
            justificativa: 'O estoque do almoxarifado central atende apenas os próximos 60 dias. A reposição evita a interrupção das rotinas administrativas das secretarias.',
            itens: [
                $this->item('material', '461787', 'Papel sulfite A4, 75 g/m², resma com 500 folhas', 'resma', 1200, 27.90),
                $this->item('material', '232690', 'Caneta esferográfica azul, ponta média', 'caixa com 50', 80, 42.50),
                $this->item('material', '278923', 'Grampeador de mesa para 25 folhas', 'unidade', 60, 38.00),
            ],
        ), $this->elaborador));
    }

    private function processoLimpezaPredial(): void
    {
        $processo = $this->novoProcesso('Serviço de limpeza e conservação predial');

        $dfd = $this->como($this->elaborador, fn () => app(DfdService::class)->criar($processo, $this->dadosDfd(
            objeto: 'Contratação de serviço continuado de limpeza e conservação predial',
            area: 'Secretaria Municipal de Administração',
            prioridade: 'alta',
            justificativa: 'O contrato vigente de limpeza termina em quatro meses e não admite nova prorrogação. É necessário iniciar uma nova contratação para não descontinuar o serviço nos prédios públicos.',
            itens: [
                $this->item('servico', '5212', 'Serviço de limpeza e conservação predial com fornecimento de materiais', 'm²/mês', 18500, 6.85),
            ],
        ), $this->elaborador));

        $this->como($this->elaborador, fn () => app(DfdService::class)->enviarParaRevisao($dfd, $this->elaborador, 'DFD pronto para análise do ordenador.'));
    }

    private function processoMerendaEscolar(): void
    {
        $processo = $this->novoProcesso('Aquisição de gêneros alimentícios para a merenda escolar');

        $dfd = $this->como($this->elaborador, fn () => app(DfdService::class)->criar($processo, $this->dadosDfd(
            objeto: 'Aquisição de gêneros alimentícios para a merenda escolar',
            area: 'Secretaria Municipal de Educação',
            prioridade: 'critica',
            justificativa: 'Abastecimento das 42 unidades escolares da rede municipal no segundo semestre letivo.',
            itens: [
                $this->item('material', '463021', 'Arroz agulhinha tipo 1, pacote de 5 kg', 'pacote', 3000, 28.40),
                $this->item('material', '463110', 'Feijão carioca tipo 1, pacote de 1 kg', 'pacote', 4500, 8.90),
            ],
        ), $this->elaborador));

        $this->como($this->elaborador, fn () => app(DfdService::class)->enviarParaRevisao($dfd, $this->elaborador));
        $this->como($this->aprovador, fn () => app(DfdService::class)->rejeitar(
            $dfd,
            $this->aprovador,
            'Os quantitativos não batem com o cardápio aprovado pelo Conselho de Alimentação Escolar. Revise com a nutricionista responsável e inclua a parcela da agricultura familiar (mínimo de 30% — Lei 11.947/2009).',
        ));
    }

    private function processoManutencaoFrota(): void
    {
        $processo = $this->novoProcesso('Manutenção preventiva e corretiva da frota');

        $this->dfdAprovado($processo, $this->dadosDfd(
            objeto: 'Contratação de manutenção preventiva e corretiva da frota municipal',
            area: 'Secretaria Municipal de Obras e Serviços Públicos',
            prioridade: 'alta',
            justificativa: 'A frota tem 86 veículos leves e pesados. Hoje a manutenção é feita por demanda, o que deixa veículos parados por muito tempo e eleva o custo.',
            itens: [
                $this->item('servico', '2780', 'Serviço de manutenção preventiva e corretiva de veículos leves', 'hora', 1500, 145.00),
                $this->item('servico', '2798', 'Serviço de manutenção preventiva e corretiva de veículos pesados', 'hora', 900, 210.00),
            ],
        ));

        $this->como($this->elaborador, fn () => app(EtpService::class)->criar($processo, [
            'conteudo' => '<h2>Necessidade da contratação</h2><p>A frota municipal precisa de manutenção contínua para os serviços essenciais: coleta, transporte escolar e obras.</p><h2>Levantamento de mercado</h2><p>Comparação em andamento entre contrato por hora de mão de obra com peças por desconto em tabela e gestão de frota por cartão.</p>',
        ], $this->elaborador));
    }

    private function processoComputadores(): void
    {
        $processo = $this->novoProcesso('Aquisição de computadores para laboratórios escolares');

        $this->dfdAprovado($processo, $this->dadosDfd(
            objeto: 'Aquisição de computadores para os laboratórios de informática das escolas municipais',
            area: 'Secretaria Municipal de Educação',
            prioridade: 'media',
            justificativa: 'Os laboratórios de informática têm equipamentos com mais de oito anos de uso, incompatíveis com as plataformas educacionais adotadas pela rede.',
            itens: [
                $this->item('material', '451283', 'Microcomputador desktop, processador 6 núcleos, 16 GB RAM, SSD 512 GB', 'unidade', 320, 4350.00),
                $this->item('material', '451290', 'Monitor LED 23,8 polegadas Full HD', 'unidade', 320, 890.00),
            ],
        ));

        $this->planejamento($processo);

        // Pesquisa ainda incompleta: o monitor tem só 2 cotações (RN-006 exige 3).
        $this->como($this->elaborador, fn () => app(PesquisaPrecoService::class)->criar($processo, [
            'metodo_referencia' => 'mediana',
            'justificativa_metodo' => 'Mediana, por ser menos sensível a cotações discrepantes (IN SEGES/ME 65/2021, art. 6º).',
            'itens' => [
                $this->itemPesquisa('451283', 'Microcomputador desktop, processador 6 núcleos, 16 GB RAM, SSD 512 GB', 'unidade', 320, 'material', [4210.00, 4380.00, 4495.00]),
                $this->itemPesquisa('451290', 'Monitor LED 23,8 polegadas Full HD', 'unidade', 320, 'material', [865.00, 910.00]),
            ],
        ], $this->elaborador));
    }

    private function processoUniformesEscolares(): void
    {
        $processo = $this->processoCompleto(
            'Aquisição de uniformes escolares',
            $this->dadosDfd(
                objeto: 'Aquisição de kits de uniforme escolar para os alunos da rede municipal',
                area: 'Secretaria Municipal de Educação',
                prioridade: 'alta',
                justificativa: 'Fornecimento gratuito de uniforme aos 9.800 alunos matriculados, conforme o programa municipal de permanência escolar.',
                itens: [
                    $this->item('material', '470125', 'Camiseta manga curta em malha PV, com brasão do município', 'unidade', 19600, 24.90),
                    $this->item('material', '470133', 'Bermuda em helanca com elástico na cintura', 'unidade', 9800, 29.50),
                ],
            ),
            [
                ['470125', 'Camiseta manga curta em malha PV, com brasão do município', 'unidade', 19600, 'material', [23.80, 25.40, 26.10]],
                ['470133', 'Bermuda em helanca com elástico na cintura', 'unidade', 9800, 'material', [28.90, 30.20, 31.00]],
            ],
            'menor_preco',
        );

        $this->como($this->elaborador, fn () => app(AprovacaoFinalService::class)->solicitar($processo->refresh(), $this->elaborador));
    }

    private function processoMedicamentos(): void
    {
        $processo = $this->processoCompleto(
            'Registro de preços de medicamentos da farmácia básica',
            $this->dadosDfd(
                objeto: 'Registro de preços para aquisição de medicamentos da farmácia básica',
                area: 'Secretaria Municipal de Saúde',
                prioridade: 'critica',
                justificativa: 'Garantir o abastecimento contínuo das 14 Unidades Básicas de Saúde com os medicamentos da RENAME.',
                itens: [
                    $this->item('material', '267508', 'Losartana potássica 50 mg, comprimido', 'comprimido', 850000, 0.09),
                    $this->item('material', '267651', 'Metformina cloridrato 850 mg, comprimido', 'comprimido', 620000, 0.11),
                ],
            ),
            [
                ['267508', 'Losartana potássica 50 mg, comprimido', 'comprimido', 850000, 'material', [0.08, 0.09, 0.12]],
                ['267651', 'Metformina cloridrato 850 mg, comprimido', 'comprimido', 620000, 'material', [0.10, 0.11, 0.13]],
            ],
            'menor_preco',
        );

        $this->como($this->elaborador, fn () => app(AprovacaoFinalService::class)->solicitar($processo->refresh(), $this->elaborador));
        $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->rejeitar(
            $processo->refresh(),
            $this->aprovador,
            'O Edital não prevê a exigência de registro na ANVISA na habilitação técnica. Inclua a exigência e a cota reservada para ME/EPP (LC 123/2006, art. 48, III) antes de nova solicitação.',
        ));
    }

    private function processoIluminacaoLed(): void
    {
        $processo = $this->processoCompleto(
            'Aquisição de luminárias LED para iluminação pública',
            $this->dadosDfd(
                objeto: 'Aquisição de luminárias LED para modernizar o parque de iluminação pública',
                area: 'Secretaria Municipal de Obras e Serviços Públicos',
                prioridade: 'media',
                justificativa: 'Trocar 2.400 luminárias de vapor de sódio por LED reduz em cerca de 55% o consumo de energia do parque de iluminação pública.',
                itens: [
                    $this->item('material', '439912', 'Luminária pública LED 100 W, IP66, com selo INMETRO', 'unidade', 2400, 780.00),
                ],
            ),
            [
                ['439912', 'Luminária pública LED 100 W, IP66, com selo INMETRO', 'unidade', 2400, 'material', [742.00, 769.00, 801.00, 815.00]],
            ],
            'menor_preco',
        );

        $this->como($this->elaborador, fn () => app(AprovacaoFinalService::class)->solicitar($processo->refresh(), $this->elaborador));
        $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->aprovar(
            $processo->refresh(),
            $this->aprovador,
            'Instrução processual completa e regular. Autorizo a publicação do edital.',
        ));
    }

    // ------------------------------------------------------------- montagem

    private function novoProcesso(string $objetoPreliminar): Processo
    {
        return $this->como($this->elaborador, fn () => app(ProcessoService::class)->criar(['objeto' => $objetoPreliminar], $this->elaborador));
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function dfdAprovado(Processo $processo, array $dados): void
    {
        $dfd = $this->como($this->elaborador, fn () => app(DfdService::class)->criar($processo, $dados, $this->elaborador));
        $this->como($this->elaborador, fn () => app(DfdService::class)->enviarParaRevisao($dfd, $this->elaborador));
        $this->como($this->aprovador, fn () => app(DfdService::class)->aprovar($dfd, $this->aprovador, 'De acordo. Siga-se com o planejamento da contratação.'));
    }

    /** ETP + Mapa de Riscos (as duas fases entre o DFD aprovado e a Pesquisa de Preços). */
    private function planejamento(Processo $processo): void
    {
        $objeto = (string) $processo->refresh()->objeto;

        $this->como($this->elaborador, fn () => app(EtpService::class)->criar($processo, [
            'conteudo' => "<h2>Descrição da necessidade</h2><p>{$objeto}, conforme a demanda formalizada no DFD.</p>"
                . '<h2>Levantamento de mercado</h2><p>Pesquisa em contratações similares de outros órgãos (PNCP) e no Painel de Preços. A solução mais vantajosa é a aquisição por pregão eletrônico.</p>'
                . '<h2>Estimativa das quantidades</h2><p>Quantidades baseadas no consumo dos últimos 24 meses e na projeção de demanda das unidades requisitantes.</p>'
                . '<h2>Viabilidade</h2><p>A contratação é técnica e economicamente viável e atende ao interesse público.</p>',
        ], $this->elaborador));

        $this->como($this->elaborador, fn () => app(MapaRiscoService::class)->criar($processo->refresh(), [
            'riscos' => [
                [
                    'descricao' => 'Licitação deserta ou fracassada',
                    'fase' => 'selecao_fornecedor',
                    'probabilidade' => 2,
                    'impacto' => 4,
                    'causa' => 'Preço estimado abaixo do praticado no mercado ou exigências de habilitação excessivas.',
                    'dano' => 'Atraso no atendimento da demanda e necessidade de repetir o certame.',
                    'alocacao' => 'contratante',
                    'acao_preventiva' => 'Pesquisa de preços ampla, com no mínimo três fontes, e exigências de habilitação proporcionais ao objeto.',
                    'responsavel_prevencao' => 'Equipe de planejamento',
                    'acao_contingencia' => 'Revisar o termo de referência e republicar o edital.',
                    'responsavel_contingencia' => 'Agente de contratação',
                ],
                [
                    'descricao' => 'Atraso na entrega pela contratada',
                    'fase' => 'gestao_contratual',
                    'probabilidade' => 3,
                    'impacto' => 3,
                    'causa' => 'Problemas logísticos ou de estoque do fornecedor.',
                    'dano' => 'Desabastecimento das unidades requisitantes.',
                    'alocacao' => 'contratada',
                    'acao_preventiva' => 'Prazos de entrega e multa moratória definidos no termo de referência.',
                    'responsavel_prevencao' => 'Gestor do contrato',
                    'acao_contingencia' => 'Aplicar sanções e convocar o próximo colocado da ata.',
                    'responsavel_contingencia' => 'Fiscal do contrato',
                ],
                [
                    'descricao' => 'Especificação técnica insuficiente',
                    'fase' => 'planejamento',
                    'probabilidade' => 2,
                    'impacto' => 3,
                    'causa' => 'Descrição genérica dos itens, que permite ofertas de baixa qualidade.',
                    'dano' => 'Recebimento de produto inadequado ao uso pretendido.',
                    'alocacao' => 'compartilhado',
                    'acao_preventiva' => 'Validação das especificações pela área técnica requisitante.',
                    'responsavel_prevencao' => 'Área requisitante',
                ],
            ],
        ], $this->elaborador));
    }

    /**
     * Processo com todos os artefatos cadastrados (DFD aprovado, ETP, Mapa
     * de Riscos, Pesquisa de Preços completa, TR e Edital) — pronto para
     * solicitar a aprovação final.
     *
     * @param array<string, mixed> $dfd
     * @param array<int, array{0: string, 1: string, 2: string, 3: float|int, 4: string, 5: array<int, float>}> $itensPesquisa
     */
    private function processoCompleto(string $objetoPreliminar, array $dfd, array $itensPesquisa, string $criterio): Processo
    {
        $processo = $this->novoProcesso($objetoPreliminar);
        $this->dfdAprovado($processo, $dfd);
        $this->planejamento($processo);

        $this->como($this->elaborador, fn () => app(PesquisaPrecoService::class)->criar($processo->refresh(), [
            'metodo_referencia' => 'media_saneada',
            'justificativa_metodo' => 'Média saneada, excluídos os valores acima ou abaixo de 25% da média (IN SEGES/ME 65/2021, art. 6º).',
            'itens' => array_map(fn (array $i): array => $this->itemPesquisa(...$i), $itensPesquisa),
        ], $this->elaborador));

        $objeto = (string) $processo->refresh()->objeto;

        $this->como($this->elaborador, fn () => app(TrService::class)->criar($processo, [
            'fundamentacao_contratacao' => '<p>A contratação está fundamentada no DFD e no ETP deste processo, nos termos do art. 6º, XXIII, da Lei 14.133/2021.</p>',
            'descricao_solucao' => "<p>{$objeto}, conforme as especificações e quantidades da Pesquisa de Preços.</p>",
            'requisitos_contratacao' => '<p>Os produtos devem ser novos, de primeiro uso e atender às normas técnicas da ABNT e do INMETRO aplicáveis.</p>',
            'modelo_execucao' => '<p>Entrega parcelada, conforme ordens de fornecimento, em até 15 dias corridos após o recebimento de cada ordem.</p>',
            'modelo_gestao_contrato' => '<p>Gestão e fiscalização por servidores designados em portaria, nos termos do art. 117 da Lei 14.133/2021.</p>',
            'criterio_julgamento' => $criterio,
            'obrigacoes_contratante' => '<p>Receber o objeto, atestar as notas fiscais e efetuar o pagamento em até 30 dias.</p>',
            'obrigacoes_contratada' => '<p>Entregar o objeto no prazo e local definidos e substituir, às suas expensas, os itens com defeito.</p>',
            'sancoes_administrativas' => '<p>Aplicam-se as sanções do art. 156 da Lei 14.133/2021, garantidos o contraditório e a ampla defesa.</p>',
            'vigencia_contrato' => '12 meses, contados da assinatura',
            'adequacao_orcamentaria' => '<p>As despesas correrão à conta da dotação orçamentária da unidade requisitante, prevista na LOA do exercício.</p>',
        ], $this->elaborador));

        $this->como($this->elaborador, fn () => app(EditalService::class)->criar($processo->refresh(), [
            'preambulo' => '<p>O Município torna público que realizará licitação na modalidade Pregão Eletrônico, regida pela Lei 14.133/2021.</p>',
            'objeto' => "<p>{$objeto}, conforme as condições do Termo de Referência anexo.</p>",
            'criterio_julgamento' => $criterio,
            'condicoes_participacao' => '<p>Podem participar empresas do ramo cadastradas na plataforma de compras eletrônicas, observadas as vedações do art. 14 da Lei 14.133/2021.</p>',
            'requisitos_habilitacao' => '<p>Habilitação jurídica, fiscal, social, trabalhista, econômico-financeira e técnica, nos termos dos arts. 62 a 70 da Lei 14.133/2021.</p>',
            'procedimento_sessao_publica' => '<p>Sessão pública em data e horário divulgados no PNCP, com fase de lances aberta.</p>',
            'prazo_recursal' => '<p>Três dias úteis para apresentar as razões recursais, contados da intimação (art. 165 da Lei 14.133/2021).</p>',
            'sancoes_administrativas' => '<p>Conforme o Termo de Referência e o art. 156 da Lei 14.133/2021.</p>',
            'disposicoes_gerais' => '<p>Os casos omissos serão resolvidos pelo agente de contratação, com base na legislação vigente.</p>',
        ], $this->elaborador));

        return $processo->refresh();
    }

    // -------------------------------------------------------------- helpers

    /**
     * Executa $acao com $user como usuário da requisição — o AuditLogger
     * lê o autor de request()->user(), que no console seria null.
     *
     * @template T
     * @param callable(): T $acao
     * @return T
     */
    private function como(User $user, callable $acao): mixed
    {
        request()->setUserResolver(fn () => $user);

        try {
            return $acao();
        } finally {
            request()->setUserResolver(fn () => null);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $itens
     * @return array<string, mixed>
     */
    private function dadosDfd(string $objeto, string $area, string $prioridade, string $justificativa, array $itens): array
    {
        return [
            'objeto' => $objeto,
            'area_requisitante' => $area,
            'grau_prioridade' => $prioridade,
            'justificativa' => "<p>{$justificativa}</p>",
            'data_previsao' => now()->addMonths(3)->toDateString(),
            'previsao_pca' => true,
            'numero_pca' => 'PCA-' . now()->year,
            'equipe_planejamento' => [
                ['nome' => 'Mariana Souza Lima', 'cargo' => 'Agente de Contratação', 'matricula' => '10482'],
                ['nome' => 'Ricardo Alves Pereira', 'cargo' => 'Analista Administrativo', 'matricula' => '11937'],
                ['nome' => 'Juliana Costa Ferreira', 'cargo' => 'Representante da Área Requisitante', 'matricula' => '12205'],
            ],
            'itens' => $itens,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function item(string $tipo, string $codigo, string $descricao, string $unidade, float|int $quantidade, float $valorUnitario): array
    {
        return [
            'tipo' => $tipo,
            'codigo' => $codigo,
            'descricao' => $descricao,
            'unidade_medida' => $unidade,
            'quantidade' => $quantidade,
            'valor_unitario' => $valorUnitario,
            'campos_extras' => [],
        ];
    }

    /**
     * @param array<int, float> $valores
     * @return array<string, mixed>
     */
    private function itemPesquisa(string $codigo, string $descricao, string $unidade, float|int $quantidade, string $tipo, array $valores): array
    {
        $fontes = [
            ['fonte' => 'Painel de Preços do Governo Federal', 'fornecedor' => null, 'referencia' => 'Contratação similar — UASG 158124'],
            ['fonte' => 'Contratação similar publicada no PNCP', 'fornecedor' => null, 'referencia' => 'Ata de registro de preços 045/' . now()->subYear()->year],
            ['fonte' => 'Cotação direta com fornecedor', 'fornecedor' => 'Comercial Paraná Distribuidora Ltda.', 'referencia' => 'Proposta por e-mail'],
            ['fonte' => 'Cotação direta com fornecedor', 'fornecedor' => 'Sul Suprimentos Institucionais Ltda.', 'referencia' => 'Proposta por e-mail'],
        ];

        $cotacoes = [];
        foreach (array_values($valores) as $i => $valor) {
            $cotacoes[] = [
                ...$fontes[$i % count($fontes)],
                'valor_unitario' => $valor,
                'data_cotacao' => now()->subDays(10 + $i * 7)->toDateString(),
            ];
        }

        return [
            'codigo' => $codigo,
            'descricao' => $descricao,
            'unidade_medida' => $unidade,
            'quantidade' => $quantidade,
            'tipo' => $tipo,
            'cotacoes' => $cotacoes,
        ];
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}

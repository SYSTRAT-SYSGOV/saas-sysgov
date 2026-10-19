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
 * Massa de dados do Licita — 50 processos distribuídos por todas as fases do
 * fluxo (DFD rascunho/em revisão/rejeitado/aprovado, planejamento, pesquisa de
 * preços, aguardando o Ordenador, aprovação final rejeitada e aprovada).
 *
 * Complementa o LicitaDadosDemonstracaoSeeder (8 cenários): este não se
 * recusa a rodar se o tenant já tiver processos; só para quando ele já tem
 * 50 ou mais. Tudo passa pelos Services do módulo, então versões, auditoria,
 * outbox e RNs (RN-005 segregação de funções, RN-006 mínimo de 3 cotações)
 * valem como no uso real.
 *
 * Uso: php artisan db:seed --class='Modules\Licita\Database\Seeders\LicitaDadosVolumeSeeder'
 */
class LicitaDadosVolumeSeeder extends Seeder
{
    protected const TOTAL = 50;

    /** Fases do fluxo, em ordem; o processo de índice N usa FASES[N % count]. */
    protected const FASES = [
        'dfd_rascunho',
        'dfd_revisao',
        'dfd_rejeitado',
        'dfd_aprovado',
        'etp',
        'planejamento',
        'pesquisa',
        'completo',
        'aprovacao_solicitada',
        'aprovacao_rejeitada',
        'aprovacao_aprovada',
    ];

    protected User $elaborador;

    protected User $aprovador;

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

        $existentes = Processo::query()->count();
        if ($existentes >= self::TOTAL) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem {$existentes} processos do Licita — nada a fazer.");
            return;
        }

        $usuarios = $tenant->users()->orderBy('users.id')->limit(2)->get();
        [$elaborador, $aprovador] = [$usuarios->get(0), $usuarios->get(1)];
        if (!$elaborador instanceof User || !$aprovador instanceof User) {
            $this->informar('O Licita exige dois usuários distintos no tenant (elaborador e aprovador — RN-005).', aviso: true);
            return;
        }
        [$this->elaborador, $this->aprovador] = [$elaborador, $aprovador];

        $catalogo = $this->catalogo();
        $criados = 0;

        for ($i = 0; $i < self::TOTAL - $existentes; $i++) {
            $modelo = $catalogo[$i % count($catalogo)];
            // Na segunda volta pelo catálogo, varia quantidades para os processos não ficarem idênticos.
            $fator = 1 + intdiv($i, count($catalogo)) * 0.25;
            $this->criarProcesso($modelo, self::FASES[$i % count(self::FASES)], $fator);
            $criados++;
        }

        $this->informar("{$criados} processos do Licita criados no tenant [{$tenant->id}] {$tenant->name}.");
    }

    /**
     * @param array{objeto: string, area: string, prioridade: string, justificativa: string, tipo: string, itens: array<int, array{0: string, 1: string, 2: string, 3: int, 4: float}>} $m
     */
    protected function criarProcesso(array $m, string $fase, float $fator): void
    {
        $itens = array_map(
            fn (array $i): array => [...$this->item($m['tipo'], $i[0], $i[1], $i[2], (int) round($i[3] * $fator), $i[4])],
            $m['itens'],
        );
        $dfdDados = $this->dadosDfd($m['objeto'], $m['area'], $m['prioridade'], $m['justificativa'], $itens);

        $processo = $this->como($this->elaborador, fn () => app(ProcessoService::class)->criar(['objeto' => $m['objeto']], $this->elaborador));
        $dfd = $this->como($this->elaborador, fn () => app(DfdService::class)->criar($processo, $dfdDados, $this->elaborador));

        if ($fase === 'dfd_rascunho') {
            return;
        }

        $this->como($this->elaborador, fn () => app(DfdService::class)->enviarParaRevisao($dfd, $this->elaborador, 'DFD pronto para análise do ordenador.'));

        if ($fase === 'dfd_revisao') {
            return;
        }

        if ($fase === 'dfd_rejeitado') {
            $this->como($this->aprovador, fn () => app(DfdService::class)->rejeitar(
                $dfd,
                $this->aprovador,
                'A justificativa não demonstra a vinculação com o planejamento anual. Detalhe a necessidade e confirme as quantidades com a área requisitante.',
            ));
            return;
        }

        $this->como($this->aprovador, fn () => app(DfdService::class)->aprovar($dfd, $this->aprovador, 'De acordo. Siga-se com o planejamento da contratação.'));

        if ($fase === 'dfd_aprovado') {
            return;
        }

        $this->criarEtp($processo, $m['objeto']);

        if ($fase === 'etp') {
            return;
        }

        $this->criarMapaRiscos($processo);

        if ($fase === 'planejamento') {
            return;
        }

        $this->criarPesquisa($processo, $itens, completa: $fase !== 'pesquisa');

        if ($fase === 'pesquisa') {
            return;
        }

        $this->criarTrEEdital($processo, $m['objeto']);

        if ($fase === 'completo') {
            return;
        }

        $this->como($this->elaborador, fn () => app(AprovacaoFinalService::class)->solicitar($processo->refresh(), $this->elaborador));

        if ($fase === 'aprovacao_rejeitada') {
            $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->rejeitar(
                $processo->refresh(),
                $this->aprovador,
                'O Edital precisa prever a cota reservada para ME/EPP (LC 123/2006, art. 48) e os critérios de sustentabilidade. Ajuste e solicite nova aprovação.',
            ));
        } elseif ($fase === 'aprovacao_aprovada') {
            $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->aprovar(
                $processo->refresh(),
                $this->aprovador,
                'Instrução processual completa e regular. Autorizo a publicação do edital.',
            ));
        }
    }

    // ------------------------------------------------------------- artefatos

    protected function criarEtp(Processo $processo, string $objeto): void
    {
        $this->como($this->elaborador, fn () => app(EtpService::class)->criar($processo->refresh(), [
            'conteudo' => "<h2>Descrição da necessidade</h2><p>{$objeto}, conforme a demanda formalizada no DFD.</p>"
                . '<h2>Levantamento de mercado</h2><p>Pesquisa em contratações similares de outros órgãos (PNCP) e no Painel de Preços. A solução mais vantajosa é a contratação por pregão eletrônico.</p>'
                . '<h2>Estimativa das quantidades</h2><p>Quantidades baseadas no consumo dos últimos 24 meses e na projeção de demanda das unidades requisitantes.</p>'
                . '<h2>Viabilidade</h2><p>A contratação é técnica e economicamente viável e atende ao interesse público.</p>',
        ], $this->elaborador));
    }

    protected function criarMapaRiscos(Processo $processo): void
    {
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
     * @param array<int, array<string, mixed>> $itens
     * @param bool $completa false deixa o último item com 2 cotações (RN-006 exige 3)
     */
    protected function criarPesquisa(Processo $processo, array $itens, bool $completa): void
    {
        $this->como($this->elaborador, fn () => app(PesquisaPrecoService::class)->criar($processo->refresh(), [
            'metodo_referencia' => 'media_saneada',
            'justificativa_metodo' => 'Média saneada, excluídos os valores acima ou abaixo de 25% da média (IN SEGES/ME 65/2021, art. 6º).',
            'itens' => $this->montarItensPesquisa($itens, $completa),
        ], $this->elaborador));
    }

    /**
     * @param array<int, array<string, mixed>> $itens
     * @return array<int, array<string, mixed>>
     */
    protected function montarItensPesquisa(array $itens, bool $completa): array
    {
        $itensPesquisa = [];
        foreach (array_values($itens) as $n => $item) {
            $preco = (float) $item['valor_unitario'];
            $valores = [round($preco * 0.96, 2), round($preco, 2), round($preco * 1.04, 2)];
            if (!$completa && $n === count($itens) - 1) {
                array_pop($valores);
            }
            $itensPesquisa[] = $this->itemPesquisa(
                (string) $item['codigo'],
                (string) $item['descricao'],
                (string) $item['unidade_medida'],
                $item['quantidade'],
                (string) $item['tipo'],
                $valores,
            );
        }

        return $itensPesquisa;
    }

    protected function criarTrEEdital(Processo $processo, string $objeto): void
    {
        $criterio = 'menor_preco';

        $this->como($this->elaborador, fn () => app(TrService::class)->criar($processo->refresh(), [
            'fundamentacao_contratacao' => '<p>A contratação está fundamentada no DFD e no ETP deste processo, nos termos do art. 6º, XXIII, da Lei 14.133/2021.</p>',
            'descricao_solucao' => "<p>{$objeto}, conforme as especificações e quantidades da Pesquisa de Preços.</p>",
            'requisitos_contratacao' => '<p>Os produtos e serviços devem atender às normas técnicas da ABNT e do INMETRO aplicáveis.</p>',
            'modelo_execucao' => '<p>Execução parcelada, conforme ordens de fornecimento, em até 15 dias corridos após o recebimento de cada ordem.</p>',
            'modelo_gestao_contrato' => '<p>Gestão e fiscalização por servidores designados em portaria, nos termos do art. 117 da Lei 14.133/2021.</p>',
            'criterio_julgamento' => $criterio,
            'obrigacoes_contratante' => '<p>Receber o objeto, atestar as notas fiscais e efetuar o pagamento em até 30 dias.</p>',
            'obrigacoes_contratada' => '<p>Executar o objeto no prazo e local definidos e substituir, às suas expensas, o que apresentar defeito.</p>',
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
    }

    // -------------------------------------------------------------- catálogo

    /**
     * 25 objetos de compras públicas municipais; o catálogo é percorrido
     * duas vezes para chegar a 50 processos.
     *
     * @return array<int, array{objeto: string, area: string, prioridade: string, justificativa: string, tipo: string, itens: array<int, array{0: string, 1: string, 2: string, 3: int, 4: float}>}>
     */
    protected function catalogo(): array
    {
        $adm = 'Secretaria Municipal de Administração';
        $edu = 'Secretaria Municipal de Educação';
        $sau = 'Secretaria Municipal de Saúde';
        $obr = 'Secretaria Municipal de Obras e Serviços Públicos';
        $ass = 'Secretaria Municipal de Assistência Social';
        $esp = 'Secretaria Municipal de Esportes e Lazer';
        $mea = 'Secretaria Municipal de Meio Ambiente';

        return [
            ['objeto' => 'Aquisição de material de expediente para as secretarias', 'area' => $adm, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'O estoque do almoxarifado central atende apenas os próximos 60 dias; a reposição evita a interrupção das rotinas administrativas.',
                'itens' => [['461787', 'Papel sulfite A4, 75 g/m², resma com 500 folhas', 'resma', 1200, 27.90], ['232690', 'Caneta esferográfica azul, ponta média', 'caixa com 50', 80, 42.50]]],
            ['objeto' => 'Contratação de serviço de limpeza e conservação predial', 'area' => $adm, 'prioridade' => 'alta', 'tipo' => 'servico',
                'justificativa' => 'O contrato vigente termina em quatro meses e não admite nova prorrogação; é preciso nova contratação para não descontinuar o serviço.',
                'itens' => [['5212', 'Serviço de limpeza e conservação predial com fornecimento de materiais', 'm²/mês', 18500, 6.85]]],
            ['objeto' => 'Aquisição de gêneros alimentícios para a merenda escolar', 'area' => $edu, 'prioridade' => 'critica', 'tipo' => 'material',
                'justificativa' => 'Abastecimento das unidades escolares da rede municipal no semestre letivo, com parcela da agricultura familiar (Lei 11.947/2009).',
                'itens' => [['463021', 'Arroz agulhinha tipo 1, pacote de 5 kg', 'pacote', 3000, 28.40], ['463110', 'Feijão carioca tipo 1, pacote de 1 kg', 'pacote', 4500, 8.90]]],
            ['objeto' => 'Manutenção preventiva e corretiva da frota municipal', 'area' => $obr, 'prioridade' => 'alta', 'tipo' => 'servico',
                'justificativa' => 'A manutenção por demanda deixa veículos parados por muito tempo e eleva o custo; a contratação contínua reduz o tempo de indisponibilidade.',
                'itens' => [['2780', 'Manutenção preventiva e corretiva de veículos leves', 'hora', 1500, 145.00], ['2798', 'Manutenção preventiva e corretiva de veículos pesados', 'hora', 900, 210.00]]],
            ['objeto' => 'Aquisição de computadores para laboratórios escolares', 'area' => $edu, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'Os equipamentos atuais têm mais de oito anos de uso e são incompatíveis com as plataformas educacionais da rede.',
                'itens' => [['451283', 'Microcomputador desktop, 6 núcleos, 16 GB RAM, SSD 512 GB', 'unidade', 320, 4350.00], ['451290', 'Monitor LED 23,8 polegadas Full HD', 'unidade', 320, 890.00]]],
            ['objeto' => 'Aquisição de uniformes escolares', 'area' => $edu, 'prioridade' => 'alta', 'tipo' => 'material',
                'justificativa' => 'Fornecimento gratuito de uniforme aos alunos matriculados, conforme o programa municipal de permanência escolar.',
                'itens' => [['470125', 'Camiseta manga curta em malha PV, com brasão do município', 'unidade', 19600, 24.90], ['470133', 'Bermuda em helanca com elástico na cintura', 'unidade', 9800, 29.50]]],
            ['objeto' => 'Registro de preços de medicamentos da farmácia básica', 'area' => $sau, 'prioridade' => 'critica', 'tipo' => 'material',
                'justificativa' => 'Garantir o abastecimento contínuo das Unidades Básicas de Saúde com os medicamentos da RENAME.',
                'itens' => [['267508', 'Losartana potássica 50 mg, comprimido', 'comprimido', 850000, 0.09], ['267651', 'Metformina cloridrato 850 mg, comprimido', 'comprimido', 620000, 0.11]]],
            ['objeto' => 'Aquisição de luminárias LED para iluminação pública', 'area' => $obr, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'Trocar luminárias de vapor de sódio por LED reduz em cerca de 55% o consumo de energia do parque de iluminação pública.',
                'itens' => [['439912', 'Luminária pública LED 100 W, IP66, com selo INMETRO', 'unidade', 2400, 780.00]]],
            ['objeto' => 'Aquisição de combustíveis para a frota municipal', 'area' => $obr, 'prioridade' => 'alta', 'tipo' => 'material',
                'justificativa' => 'Abastecimento dos veículos da coleta de lixo, transporte escolar e saúde, sem interrupção dos serviços essenciais.',
                'itens' => [['150108', 'Óleo diesel S-10', 'litro', 240000, 6.12], ['150205', 'Gasolina comum', 'litro', 90000, 6.35]]],
            ['objeto' => 'Aquisição de equipamentos de proteção individual', 'area' => $obr, 'prioridade' => 'alta', 'tipo' => 'material',
                'justificativa' => 'Atender às normas de segurança do trabalho (NR-6) para os servidores das equipes de campo.',
                'itens' => [['390211', 'Capacete de segurança com jugular, classe B', 'unidade', 400, 32.00], ['390340', 'Luva de segurança em vaqueta', 'par', 1200, 18.50]]],
            ['objeto' => 'Contratação de serviço de vigilância patrimonial', 'area' => $adm, 'prioridade' => 'alta', 'tipo' => 'servico',
                'justificativa' => 'Proteção do patrimônio público e controle de acesso nos prédios administrativos e escolas.',
                'itens' => [['5380', 'Vigilância patrimonial desarmada, posto 12 horas diurno', 'posto/mês', 36, 8450.00]]],
            ['objeto' => 'Aquisição de mobiliário escolar', 'area' => $edu, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'Reposição do mobiliário danificado e atendimento ao aumento de matrículas.',
                'itens' => [['440120', 'Conjunto aluno com mesa e cadeira, tamanho 4', 'conjunto', 1500, 285.00], ['440158', 'Armário de aço com 2 portas', 'unidade', 120, 740.00]]],
            ['objeto' => 'Aquisição de material hospitalar descartável', 'area' => $sau, 'prioridade' => 'critica', 'tipo' => 'material',
                'justificativa' => 'Reposição dos insumos usados diariamente nos atendimentos das unidades de saúde e na vacinação.',
                'itens' => [['271045', 'Seringa descartável 5 mL, com agulha', 'caixa com 100', 900, 62.00], ['271190', 'Luva de procedimento látex, tamanho M', 'caixa com 100', 2500, 38.00]]],
            ['objeto' => 'Contratação de transporte escolar terceirizado', 'area' => $edu, 'prioridade' => 'critica', 'tipo' => 'servico',
                'justificativa' => 'A frota própria não cobre todas as rotas rurais; a complementação garante o acesso dos alunos às escolas.',
                'itens' => [['5440', 'Transporte escolar rural, rota de até 60 km/dia', 'rota/mês', 48, 7200.00]]],
            ['objeto' => 'Aquisição de cestas básicas para famílias em vulnerabilidade', 'area' => $ass, 'prioridade' => 'critica', 'tipo' => 'material',
                'justificativa' => 'Atendimento emergencial a famílias cadastradas no CadÚnico, conforme a lei municipal de benefícios eventuais.',
                'itens' => [['463500', 'Cesta básica com 22 itens, conforme composição do edital', 'unidade', 6000, 168.00]]],
            ['objeto' => 'Aquisição de materiais esportivos', 'area' => $esp, 'prioridade' => 'baixa', 'tipo' => 'material',
                'justificativa' => 'Equipar as escolinhas esportivas e os torneios municipais com materiais em bom estado de uso.',
                'itens' => [['480015', 'Bola de futsal oficial, tamanho adulto', 'unidade', 150, 135.00], ['480102', 'Rede de vôlei oficial com antenas', 'unidade', 30, 410.00]]],
            ['objeto' => 'Contratação de serviço de manutenção de áreas verdes', 'area' => $mea, 'prioridade' => 'media', 'tipo' => 'servico',
                'justificativa' => 'Manter praças, canteiros e áreas públicas roçadas e podadas, reduzindo riscos e reclamações da população.',
                'itens' => [['5590', 'Serviço de roçada, capina e poda em áreas públicas', 'm²', 420000, 1.45]]],
            ['objeto' => 'Aquisição de mudas para arborização urbana', 'area' => $mea, 'prioridade' => 'baixa', 'tipo' => 'material',
                'justificativa' => 'Cumprir o plano municipal de arborização com espécies nativas adequadas à calçada e à rede elétrica.',
                'itens' => [['410220', 'Muda de árvore nativa, altura mínima 1,5 m', 'unidade', 3500, 24.00]]],
            ['objeto' => 'Aquisição de equipamentos de informática para a administração', 'area' => $adm, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'Substituir equipamentos obsoletos que causam lentidão nos sistemas de gestão municipais.',
                'itens' => [['451301', 'Notebook 15,6 pol., 16 GB RAM, SSD 512 GB', 'unidade', 180, 4980.00], ['451377', 'Impressora multifuncional laser monocromática', 'unidade', 60, 1890.00]]],
            ['objeto' => 'Contratação de serviço de manutenção de ar-condicionado', 'area' => $adm, 'prioridade' => 'media', 'tipo' => 'servico',
                'justificativa' => 'Manutenção preventiva obrigatória (PMOC, Lei 13.589/2018) dos aparelhos dos prédios públicos.',
                'itens' => [['5620', 'Manutenção preventiva de ar-condicionado split até 30.000 BTUs', 'aparelho', 420, 165.00]]],
            ['objeto' => 'Aquisição de pneus e câmaras de ar para a frota', 'area' => $obr, 'prioridade' => 'media', 'tipo' => 'material',
                'justificativa' => 'Reposição de pneus dos veículos de coleta, transporte escolar e máquinas, com menor risco de acidentes.',
                'itens' => [['190340', 'Pneu 275/80 R22,5 para caminhão', 'unidade', 120, 2150.00], ['190412', 'Pneu 205/65 R15 para veículos leves', 'unidade', 200, 520.00]]],
            ['objeto' => 'Aquisição de livros para as bibliotecas escolares', 'area' => $edu, 'prioridade' => 'baixa', 'tipo' => 'material',
                'justificativa' => 'Ampliar e atualizar o acervo das bibliotecas, incentivando a leitura e atendendo ao Plano Municipal do Livro.',
                'itens' => [['485010', 'Livro de literatura infantojuvenil, título variado', 'unidade', 5000, 34.00]]],
            ['objeto' => 'Contratação de serviço de coleta de resíduos de saúde', 'area' => $sau, 'prioridade' => 'alta', 'tipo' => 'servico',
                'justificativa' => 'Coleta, transporte e destinação final dos resíduos dos grupos A e E, conforme a RDC ANVISA 222/2018.',
                'itens' => [['5710', 'Coleta, transporte e destinação final de resíduos de serviços de saúde', 'kg', 36000, 7.80]]],
            ['objeto' => 'Aquisição de equipamentos para academia ao ar livre', 'area' => $esp, 'prioridade' => 'baixa', 'tipo' => 'material',
                'justificativa' => 'Instalar academias ao ar livre nos bairros para estimular a prática de atividade física pela população.',
                'itens' => [['480540', 'Conjunto de aparelhos de ginástica para academia ao ar livre, 8 estações', 'conjunto', 12, 14800.00]]],
        ];
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
    protected function como(User $user, callable $acao): mixed
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
    protected function dadosDfd(string $objeto, string $area, string $prioridade, string $justificativa, array $itens): array
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
    protected function item(string $tipo, string $codigo, string $descricao, string $unidade, float|int $quantidade, float $valorUnitario): array
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
    protected function itemPesquisa(string $codigo, string $descricao, string $unidade, float|int $quantidade, string $tipo, array $valores): array
    {
        $fontes = [
            ['fonte' => 'Painel de Preços do Governo Federal', 'fornecedor' => null, 'referencia' => 'Contratação similar — UASG 158124'],
            ['fonte' => 'Contratação similar publicada no PNCP', 'fornecedor' => null, 'referencia' => 'Ata de registro de preços 045/' . now()->subYear()->year],
            ['fonte' => 'Cotação direta com fornecedor', 'fornecedor' => 'Comercial Paraná Distribuidora Ltda.', 'referencia' => 'Proposta por e-mail'],
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
    protected function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}

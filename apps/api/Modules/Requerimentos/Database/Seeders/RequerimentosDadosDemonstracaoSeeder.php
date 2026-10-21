<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Modules\Requerimentos\Models\EtapaTramitacao;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\Resposta;
use Modules\Requerimentos\Models\TipoInstrumento;
use Modules\Requerimentos\Models\TramitacaoPoderes;
use Modules\Requerimentos\Services\ProposicaoService;
use Modules\Requerimentos\Services\RespostaService;
use Modules\Requerimentos\Services\TramitacaoPoderesService;

/**
 * Massa de dados de demonstração do módulo Requerimentos — cerca de 60
 * proposições da Câmara e da Prefeitura, em todas as situações do fluxo:
 *
 *  - instrumentos que vão ao outro Poder (requerimento, indicação, ofício):
 *    protocolado, encaminhado, recebido, respondido (com resposta enviada ou
 *    em rascunho) e vencido (prazo regimental estourado);
 *  - instrumentos com tramitação interna (projeto de lei, resolução, decreto
 *    legislativo, moção): em tramitação em cada etapa, aprovado, rejeitado e
 *    arquivado, com as etapas e datas correspondentes;
 *  - vinculações entre proposições (apensada, dependente, relacionada).
 *
 * Tudo passa pelos Services do módulo (numeração sequencial, eventos,
 * notificações no portal, auditoria); só as datas são reescritas depois, para
 * a linha do tempo ficar espalhada pelos últimos meses.
 *
 * Uso: php artisan db:seed --force --class='Modules\Requerimentos\Database\Seeders\RequerimentosDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver proposições (evita duplicar).
 */
final class RequerimentosDadosDemonstracaoSeeder extends Seeder
{
    private const ETAPAS = [
        'protocolo' => 'Protocolo',
        'comissao_constituicao_justica' => 'Comissão de Constituição e Justiça',
        'comissao_financas' => 'Comissão de Finanças e Orçamento',
        'pauta' => 'Inclusão em pauta',
        'votacao' => 'Votação em plenário',
        'sancao' => 'Sanção do Prefeito',
        'publicacao' => 'Publicação',
    ];

    private const PARTIDOS = ['Bancada do Governo', 'Bancada Independente', 'Bancada da Oposição', 'Bloco Progressista', 'Bloco Municipalista'];

    private User $autor;

    private User $coautor;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear em Requerimentos.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (Proposicao::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem proposições — nada a fazer.");
            return;
        }

        $usuarios = $tenant->users()->orderBy('users.id')->limit(2)->get();
        [$autor, $coautor] = [$usuarios->get(0), $usuarios->get(1)];
        if (!$autor instanceof User || !$coautor instanceof User) {
            $this->informar('São necessários dois usuários no tenant (autor e respondente).', aviso: true);
            return;
        }
        [$this->autor, $this->coautor] = [$autor, $coautor];

        // Garante os tipos de instrumento padrão do tenant.
        app(TiposInstrumentoDefaultSeeder::class)->run();

        $tipos = TipoInstrumento::query()->ativo()->get()->keyBy('slug');
        $criadas = [];
        $i = 0;

        foreach ($this->catalogo() as $slug => $linhas) {
            $tipo = $tipos->get($slug);
            if ($tipo === null) {
                continue;
            }

            foreach ($linhas as $n => $linha) {
                [$ementa, $justificativa, $area] = $linha;
                $cenario = $this->cenarios($tipo)[$n % count($this->cenarios($tipo))];
                $criadas[] = $this->criar($tipo, $ementa, $justificativa, $area, $cenario, $i++);
            }
        }

        $this->vincular($criadas);

        $this->informar(count($criadas) . " proposições de demonstração criadas no tenant [{$tenant->id}] {$tenant->name}.");
    }

    // -------------------------------------------------------------- cenários

    /** @return array<int, string> */
    private function cenarios(TipoInstrumento $tipo): array
    {
        if ($tipo->exige_tramitacao_interna) {
            return ['protocolado', 'andamento', 'andamento', 'andamento', 'aprovado', 'aprovado', 'rejeitado', 'arquivado'];
        }

        return ['protocolado', 'encaminhado', 'encaminhado_prazo_proximo', 'recebido', 'respondido', 'respondido', 'resposta_rascunho', 'vencido'];
    }

    private function criar(TipoInstrumento $tipo, string $ementa, string $justificativa, string $area, string $cenario, int $i): Proposicao
    {
        $prazo = (int) ($tipo->prazo_regimental_dias ?? 30);
        $origem = $tipo->poder_origem;
        $destino = $origem === Proposicao::PODER_CAMARA ? Proposicao::PODER_PREFEITURA : Proposicao::PODER_CAMARA;

        // Há quantos dias o documento foi protocolado, conforme o cenário.
        $diasAtras = match ($cenario) {
            'protocolado' => 2 + $i % 9,
            'encaminhado' => 6 + $i % 10,
            'encaminhado_prazo_proximo' => max($prazo - 3, 4),
            'recebido' => 8 + $i % 14,
            'respondido', 'resposta_rascunho' => 20 + $i % 60,
            'vencido' => $prazo + 12 + $i % 30,
            'andamento' => 20 + $i % 70,
            default => 60 + $i % 100,
        };
        $criadoEm = Carbon::today()->subDays($diasAtras)->setTime(9 + $i % 8, ($i * 7) % 60);

        $proposicao = $this->como($this->autor, fn () => app(ProposicaoService::class)->criar([
            'tipo_slug' => $tipo->slug,
            'ementa' => $ementa,
            'justificativa' => "<p>{$justificativa}</p>",
            'conteudo' => "<p>{$ementa}</p><p>{$justificativa}</p>",
            'area_tematica' => $area,
            'partido_bancada' => $origem === Proposicao::PODER_CAMARA ? self::PARTIDOS[$i % count(self::PARTIDOS)] : null,
            'visibilidade_publica' => $i % 9 !== 0,
            'coautores' => $i % 3 === 0 ? [['user_id' => $this->coautor->id, 'tipo_autor' => 'vereador']] : [],
            'metadata' => ['origem' => 'demonstracao'],
        ], $this->autor));

        if ($tipo->exige_tramitacao_interna) {
            $this->tramitacaoInterna($proposicao, $tipo, $cenario, $criadoEm);
        } else {
            $this->tramitacaoPoderes($proposicao, $cenario, $origem, $destino, $prazo, $criadoEm);
        }

        $this->ajustarDatas($proposicao, $criadoEm);

        return $proposicao->refresh();
    }

    private function tramitacaoPoderes(Proposicao $proposicao, string $cenario, string $origem, string $destino, int $prazo, Carbon $criadoEm): void
    {
        if ($cenario === 'protocolado') {
            return;
        }

        $tramitacao = $this->como($this->autor, fn () => app(TramitacaoPoderesService::class)->encaminhar($proposicao, [
            'poder_origem' => $origem,
            'poder_destino' => $destino,
            'responsavel_id' => $this->coautor->id,
            'prazo_dias' => $prazo,
            'observacao' => 'Encaminhado para manifestação no prazo regimental.',
        ], $this->autor));

        $encaminhadoEm = $criadoEm->copy()->addDay();
        $recebidoEm = $encaminhadoEm->copy()->addDays(2);

        if (in_array($cenario, ['recebido', 'respondido', 'resposta_rascunho', 'vencido'], true)) {
            $this->como($this->coautor, fn () => app(TramitacaoPoderesService::class)->registrarRecebimento($tramitacao, $this->coautor));
        }

        if ($cenario === 'respondido') {
            $this->como($this->coautor, fn () => app(TramitacaoPoderesService::class)->devolver(
                $tramitacao->refresh(),
                '<p>Em atenção à proposição, informamos que a matéria foi analisada pela área técnica competente e as providências cabíveis foram adotadas, conforme manifestação anexa ao processo.</p>',
                [],
                $this->coautor,
            ));
        } elseif ($cenario === 'resposta_rascunho') {
            $this->como($this->coautor, fn () => app(RespostaService::class)->elaborar(
                $tramitacao->refresh(),
                ['conteudo' => '<p>Minuta de resposta em elaboração. Aguardando parecer da procuradoria antes do envio.</p>'],
                $this->coautor->id,
            ));
        } elseif ($cenario === 'vencido') {
            $tramitacao->update(['status' => TramitacaoPoderes::STATUS_VENCIDO]);
            $proposicao->update(['status' => Proposicao::STATUS_VENCIDO]);
        }

        // Datas coerentes com a linha do tempo (o Service grava sempre "hoje").
        $tramitacao->refresh()->update([
            'data_encaminhamento' => $encaminhadoEm->toDateString(),
            'data_recebimento' => $tramitacao->data_recebimento !== null ? $recebidoEm->toDateString() : null,
            'data_limite_resposta' => $encaminhadoEm->copy()->addDays($prazo)->toDateString(),
        ]);

        $resposta = Resposta::query()->where('tramitacao_id', $tramitacao->id)->first();
        if ($resposta !== null) {
            $enviadoEm = $recebidoEm->copy()->addDays(5 + $proposicao->id % 10)->setTime(15, 30);
            $resposta->update([
                'enviado_em' => $resposta->status === Resposta::STATUS_ENVIADO ? $enviadoEm : null,
            ]);
            $resposta->newQuery()->whereKey($resposta->id)->toBase()->update(['created_at' => $enviadoEm, 'updated_at' => $enviadoEm]);
        }
    }

    private function tramitacaoInterna(Proposicao $proposicao, TipoInstrumento $tipo, string $cenario, Carbon $criadoEm): void
    {
        if ($cenario === 'protocolado') {
            return;
        }

        /** @var array<int, string> $etapas */
        $etapas = $tipo->campos_especificos['etapas'] ?? ['protocolo', 'pauta', 'votacao'];
        $total = count($etapas);

        // Quantas etapas já foram concluídas e qual está em andamento.
        $concluidas = match ($cenario) {
            'andamento' => min(1 + $proposicao->id % max($total - 1, 1), $total - 1),
            'aprovado', 'rejeitado' => $total,
            default => min(2, $total - 1), // arquivado: parou no meio
        };

        $status = match ($cenario) {
            'aprovado' => Proposicao::STATUS_APROVADO,
            'rejeitado' => Proposicao::STATUS_REJEITADO,
            'arquivado' => Proposicao::STATUS_ARQUIVADO,
            default => Proposicao::STATUS_EM_TRAMITACAO_INTERNA,
        };
        $proposicao->update(['status' => $status]);

        $data = $criadoEm->copy();
        foreach ($etapas as $ordem => $slug) {
            $prazoDias = 10;
            $inicio = $data->copy();
            $fim = $data->copy()->addDays(4 + $ordem * 2);
            $estado = match (true) {
                $ordem < $concluidas => EtapaTramitacao::STATUS_CONCLUIDA,
                $ordem === $concluidas && $cenario === 'andamento' => EtapaTramitacao::STATUS_EM_ANDAMENTO,
                default => EtapaTramitacao::STATUS_PENDENTE,
            };

            $observacao = null;
            if ($estado === EtapaTramitacao::STATUS_CONCLUIDA) {
                $observacao = $slug === 'votacao' && $cenario === 'rejeitado'
                    ? 'Rejeitado em plenário por maioria dos votos.'
                    : 'Etapa concluída sem ressalvas.';
            } elseif ($estado === EtapaTramitacao::STATUS_EM_ANDAMENTO) {
                $observacao = 'Aguardando parecer.';
            }

            EtapaTramitacao::create([
                'tenant_id' => $proposicao->tenant_id,
                'proposicao_id' => $proposicao->id,
                'etapa_nome' => self::ETAPAS[$slug] ?? ucfirst(str_replace('_', ' ', $slug)),
                'ordem' => $ordem + 1,
                'status' => $estado,
                'responsavel_id' => $ordem % 2 === 0 ? $this->autor->id : $this->coautor->id,
                'data_inicio' => $estado === EtapaTramitacao::STATUS_PENDENTE ? null : $inicio->toDateString(),
                'data_conclusao' => $estado === EtapaTramitacao::STATUS_CONCLUIDA ? $fim->toDateString() : null,
                'prazo_dias' => $prazoDias,
                'observacao' => $observacao,
            ]);

            $data = $fim->copy()->addDay();
        }
    }

    /** @param array<int, Proposicao> $proposicoes */
    private function vincular(array $proposicoes): void
    {
        $service = app(ProposicaoService::class);
        $tipos = [\Modules\Requerimentos\Models\Vinculacao::TIPO_RELACIONADA, \Modules\Requerimentos\Models\Vinculacao::TIPO_APENSADA, \Modules\Requerimentos\Models\Vinculacao::TIPO_DEPENDENTE];

        // Liga proposições da mesma área temática, duas a duas.
        $porArea = [];
        foreach ($proposicoes as $p) {
            $porArea[(string) $p->area_tematica][] = $p;
        }

        $n = 0;
        foreach ($porArea as $grupo) {
            for ($k = 0; $k + 1 < count($grupo) && $n < 12; $k += 4) {
                $service->vincular($grupo[$k], $grupo[$k + 1], $tipos[$n % count($tipos)], 'Matérias correlatas, tramitam em conjunto.');
                $n++;
            }
        }
    }

    // ---------------------------------------------------------------- datas

    private function ajustarDatas(Proposicao $proposicao, Carbon $criadoEm): void
    {
        $proposicao->newQuery()->whereKey($proposicao->id)->toBase()->update([
            'created_at' => $criadoEm,
            'updated_at' => $criadoEm->copy()->addDays(min(3, max(0, (int) $criadoEm->diffInDays(now())))),
        ]);
    }

    // -------------------------------------------------------------- catálogo

    /**
     * @return array<string, array<int, array{0: string, 1: string, 2: string}>>
     */
    private function catalogo(): array
    {
        return [
            'requerimento' => [
                ['Requer informações sobre o cronograma de reforma das unidades básicas de saúde', 'Moradores relatam infiltrações e falta de acessibilidade nas unidades; é necessário conhecer o cronograma e os recursos previstos.', 'Saúde'],
                ['Requer cópia dos contratos de manutenção da iluminação pública', 'Há reclamações constantes de ruas às escuras; a Câmara precisa fiscalizar a execução dos contratos vigentes.', 'Obras e infraestrutura'],
                ['Requer relação dos veículos da frota do transporte escolar e sua situação de manutenção', 'Garantir a segurança dos alunos transportados diariamente nas rotas urbanas e rurais.', 'Educação'],
                ['Requer informações sobre a destinação dos recursos do Fundeb no último exercício', 'Acompanhamento da aplicação dos recursos da educação, em cumprimento à função fiscalizadora do Legislativo.', 'Educação'],
                ['Requer esclarecimentos sobre a coleta seletiva de resíduos no município', 'A população questiona a regularidade da coleta e o destino do material reciclável.', 'Meio ambiente'],
                ['Requer informações sobre a fila de espera para consultas com especialistas', 'O tempo de espera supera seis meses em várias especialidades, segundo relatos de pacientes.', 'Saúde'],
                ['Requer cópia do plano de pavimentação dos bairros periféricos', 'Conhecer prioridades e prazos para as ruas sem asfalto, que alagam no período de chuvas.', 'Obras e infraestrutura'],
                ['Requer relatório das multas de trânsito arrecadadas e sua aplicação', 'Transparência sobre o uso da receita de multas, que deve ser aplicada em sinalização e segurança viária.', 'Transporte e trânsito'],
                ['Requer informações sobre o convênio de segurança com a Polícia Militar', 'Verificar o cumprimento das contrapartidas do município e o efetivo atuante nas escolas.', 'Segurança pública'],
                ['Requer cópia da folha de pagamento dos servidores comissionados', 'Atender ao princípio da publicidade e permitir o acompanhamento das despesas de pessoal.', 'Administração'],
                ['Requer informações sobre os atendimentos do CRAS no último semestre', 'Dimensionar a demanda por assistência social e avaliar a necessidade de ampliar a equipe.', 'Assistência social'],
                ['Requer esclarecimentos sobre a manutenção das quadras esportivas municipais', 'Várias quadras estão sem iluminação e com alambrados danificados, o que impede o uso pela comunidade.', 'Cultura e esporte'],
                ['Requer informações sobre a arrecadação de IPTU e a inadimplência por região', 'Subsidiar a discussão da política de cobrança e eventual programa de recuperação fiscal.', 'Finanças e tributos'],
                ['Requer cópia dos laudos de vistoria das pontes e bueiros do município', 'Prevenir acidentes e alagamentos com base na situação estrutural das obras de arte.', 'Obras e infraestrutura'],
            ],
            'indicacao' => [
                ['Indica a instalação de faixa elevada em frente à escola municipal do bairro Centro', 'Alto fluxo de veículos e de crianças no horário de entrada e saída das aulas.', 'Transporte e trânsito'],
                ['Indica a poda de árvores na praça central', 'Galhos próximos à rede elétrica e à calçada oferecem risco aos pedestres.', 'Meio ambiente'],
                ['Indica a ampliação do horário de funcionamento da farmácia básica', 'Trabalhadores não conseguem retirar medicamentos no horário atual de atendimento.', 'Saúde'],
                ['Indica a construção de um ponto de ônibus coberto no distrito rural', 'Usuários esperam o transporte sob sol e chuva, sem qualquer abrigo.', 'Transporte e trânsito'],
                ['Indica a revitalização do campo de futebol do bairro Vila Nova', 'O espaço é muito usado pela juventude e está sem manutenção há anos.', 'Cultura e esporte'],
                ['Indica a implantação de câmeras de monitoramento na rodoviária', 'Registros de furtos e a necessidade de maior sensação de segurança aos viajantes.', 'Segurança pública'],
                ['Indica a criação de um programa de hortas comunitárias', 'Incentivar a alimentação saudável e o aproveitamento de terrenos ociosos.', 'Meio ambiente'],
                ['Indica a recuperação da rua das Palmeiras, com tapa-buracos', 'Os buracos danificam veículos e dificultam a passagem do transporte escolar.', 'Obras e infraestrutura'],
                ['Indica a oferta de oficinas de arte e música no contraturno escolar', 'Ocupar o tempo livre das crianças e ampliar o acesso à cultura.', 'Cultura e esporte'],
                ['Indica a reposição de lâmpadas queimadas na avenida principal', 'A via é escura à noite e já houve ocorrências de assaltos no trecho.', 'Obras e infraestrutura'],
            ],
            'oficio' => [
                ['Solicita à Secretaria de Obras o cronograma de recapeamento da avenida Brasil', 'A Câmara recebeu abaixo-assinado de moradores e comerciantes da região.', 'Obras e infraestrutura'],
                ['Encaminha ao Executivo o relatório da audiência pública sobre saneamento', 'Subsidiar o planejamento das ações de saneamento básico do município.', 'Meio ambiente'],
                ['Solicita informações sobre o plano de contingência para a temporada de chuvas', 'Preparar a defesa civil e evitar prejuízos às famílias de áreas de risco.', 'Segurança pública'],
                ['Solicita à Secretaria de Educação a lista de vagas em creches por bairro', 'Avaliar a demanda reprimida e a necessidade de novas unidades.', 'Educação'],
                ['Encaminha pedido da associação de moradores sobre coleta de entulho', 'Atender a solicitação de mutirão de limpeza nos bairros do Sul.', 'Meio ambiente'],
                ['Solicita estudo de viabilidade de linha de ônibus ao hospital municipal', 'Facilitar o acesso de pacientes e acompanhantes de bairros distantes.', 'Transporte e trânsito'],
            ],
            'oficio_prefeitura' => [
                ['Encaminha à Câmara o projeto da Lei Orçamentária para o próximo exercício', 'Cumprimento do prazo legal de envio da proposta orçamentária ao Legislativo.', 'Finanças e tributos'],
                ['Comunica a abertura de processo seletivo para agentes comunitários de saúde', 'Dar ciência à Câmara e solicitar divulgação aos munícipes.', 'Saúde'],
                ['Responde ao pedido de informações sobre o Fundeb e encaminha documentação', 'Atendimento ao requerimento aprovado em sessão plenária.', 'Educação'],
                ['Solicita à Câmara a indicação de representantes para o conselho municipal', 'Composição do conselho, conforme previsto na lei de criação.', 'Administração'],
                ['Comunica a realização de obras de drenagem e interdição parcial de via', 'Informar os vereadores sobre o calendário das obras e os desvios de trânsito.', 'Obras e infraestrutura'],
            ],
            'projeto_lei' => [
                ['Institui o Programa Municipal de Hortas Comunitárias', 'Estimula a agricultura urbana, a segurança alimentar e o uso de terrenos públicos ociosos.', 'Meio ambiente'],
                ['Dispõe sobre a obrigatoriedade de acessibilidade em prédios públicos municipais', 'Adequa os imóveis às normas de acessibilidade e garante o direito de locomoção.', 'Obras e infraestrutura'],
                ['Cria o Conselho Municipal de Políticas sobre Drogas', 'Fortalece a rede de prevenção e tratamento no município, com participação da sociedade civil.', 'Saúde'],
                ['Autoriza o Executivo a conceder desconto no IPTU para imóveis com energia solar', 'Incentiva a geração limpa de energia e a sustentabilidade urbana.', 'Finanças e tributos'],
                ['Institui a Semana Municipal de Combate ao Bullying nas escolas', 'Promove ações educativas e de conscientização em toda a rede de ensino.', 'Educação'],
                ['Dispõe sobre a proibição de fogos de artifício com estampido', 'Protege pessoas com transtorno do espectro autista, idosos e animais.', 'Saúde'],
                ['Cria o programa Primeiro Emprego Jovem no município', 'Estimula a contratação de jovens por meio de incentivos às empresas locais.', 'Assistência social'],
                ['Regulamenta o funcionamento de feiras livres e a ocupação de espaços públicos', 'Organiza a atividade e garante segurança sanitária e renda aos feirantes.', 'Administração'],
                ['Institui o Dia Municipal do Agricultor Familiar', 'Reconhece a importância do setor para o abastecimento e a economia do município.', 'Cultura e esporte'],
            ],
            'projeto_resolucao' => [
                ['Altera o Regimento Interno para criar a Comissão de Meio Ambiente', 'Dá tratamento especializado às matérias ambientais na Câmara.', 'Administração'],
                ['Dispõe sobre o uso do plenário para eventos institucionais', 'Regulamenta a cessão do espaço e os critérios de utilização.', 'Administração'],
                ['Institui a Tribuna Popular nas sessões ordinárias', 'Amplia a participação da sociedade nos debates legislativos.', 'Administração'],
                ['Cria o Prêmio Mérito Cidadão da Câmara Municipal', 'Reconhece pessoas e entidades com relevantes serviços à comunidade.', 'Cultura e esporte'],
            ],
            'projeto_decreto_legislativo' => [
                ['Concede o título de Cidadão Honorário ao Dr. Paulo Mendes de Almeida', 'Homenagem pelos relevantes serviços prestados à saúde do município.', 'Cultura e esporte'],
                ['Aprova as contas do Executivo referentes ao exercício anterior', 'Julgamento das contas, conforme parecer prévio do Tribunal de Contas.', 'Finanças e tributos'],
                ['Concede a Medalha do Mérito Esportivo a atletas da seleção municipal', 'Reconhece o desempenho em competições estaduais.', 'Cultura e esporte'],
                ['Susta os efeitos de decreto do Executivo que exorbita o poder regulamentar', 'A matéria extrapola os limites da lei que o decreto pretendia regulamentar.', 'Administração'],
            ],
            'mocao' => [
                ['Moção de aplauso à equipe do SAMU pelo atendimento à população', 'Reconhecimento pela atuação dedicada nas ocorrências do último ano.', 'Saúde'],
                ['Moção de repúdio ao corte de verbas da merenda escolar', 'Manifestação contra a redução de recursos que afeta alunos da rede pública.', 'Educação'],
                ['Moção de pesar pelo falecimento do ex-vereador José Carlos Ferreira', 'Homenagem a quem dedicou anos de serviço à vida pública do município.', 'Cultura e esporte'],
                ['Moção de apoio à duplicação da rodovia de acesso ao município', 'Reforçar o pleito junto ao governo estadual por obras de segurança viária.', 'Transporte e trânsito'],
                ['Moção de aplauso à Guarda Municipal pelo trabalho em escolas', 'Reconhecimento do programa de proximidade com a comunidade escolar.', 'Segurança pública'],
                ['Moção de congratulações à banda municipal pelos 50 anos de história', 'Valorização do patrimônio cultural e da formação de músicos locais.', 'Cultura e esporte'],
            ],
        ];
    }

    // -------------------------------------------------------------- helpers

    /**
     * Executa $acao com $user como usuário da requisição (auditoria e
     * listeners leem request()->user(), que no console seria null).
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

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}

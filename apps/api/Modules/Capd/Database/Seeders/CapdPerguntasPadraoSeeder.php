<?php

declare(strict_types=1);

namespace Modules\Capd\Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\ModeloFatorPeso;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Models\PlanoCarreira;

/**
 * Seed padrão dos modelos de formulário e perguntas do CAPD.
 *
 * Estrutura canônica separada em 4 Grupos Funcionais / Carreiras:
 * 1. Segurança Pública: Guarda Municipal, Agentes de Segurança e Defesa Social (SMSP)
 * 2. Saúde: Médicos, Enfermagem, Técnicos, Agentes de Saúde e Endemias (SMS)
 * 3. Magistério: Professores, Pedagogos, Educadores e Especialistas de Educação (SMED)
 * 4. Quadro Geral: Cargos Administrativos, Operacionais e Técnicos
 *
 * Cada grupo possui escala gráfica de Chiavenato (Graus 1 a 5) com pesos dos grupos somando 100%.
 */
final class CapdPerguntasPadraoSeeder extends Seeder
{
    private array $opcoesEscalaPadrao = [
        ['valor' => 1, 'rotulo' => 'Grau 1 - Insuficiente', 'descricao' => 'Apresenta desempenho abaixo do padrão exigido para a função, necessitando orientação constante.'],
        ['valor' => 2, 'rotulo' => 'Grau 2 - Regular', 'descricao' => 'Atende parcialmente aos padrões, demandando aprimoramento em pontos específicos.'],
        ['valor' => 3, 'rotulo' => 'Grau 3 - Bom', 'descricao' => 'Cumpre plenamente e com regularidade todos os deveres e exigências do cargo.'],
        ['valor' => 4, 'rotulo' => 'Grau 4 - Muito Bom', 'descricao' => 'Supera as expectativas habituais com presteza, zelo e iniciativa.'],
        ['valor' => 5, 'rotulo' => 'Grau 5 - Excelente', 'descricao' => 'Desempenho exemplar de referência institucional com contribuições destacadas.'],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $context = app(\App\Support\TenantContext::class);
        $previousTenant = $context->hasTenant() ? $context->get() : null;
        $tenant = Tenant::find($tenantId);
        if ($tenant) {
            $context->set($tenant);
        }

        try {
            // ── 1. Planos de Carreira para os 4 Grupos Funcionais ─────────────────
            $planoGeral = PlanoCarreira::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'codigo' => 'GERAL'],
                [
                    'nome'           => 'Plano de Cargos e Salários do Quadro Geral',
                    'lei_referencia' => 'Lei Municipal nº 1.704/2006',
                    'ativo'          => true,
                ]
            );

            $planoMagisterio = PlanoCarreira::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'codigo' => 'MAGISTERIO'],
                [
                    'nome'           => 'Plano de Carreira do Magistério Municipal',
                    'lei_referencia' => 'Lei Municipal nº 1.835/2008',
                    'ativo'          => true,
                ]
            );

            $planoSeguranca = PlanoCarreira::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'codigo' => 'SEGURANCA'],
                [
                    'nome'           => 'Plano de Carreira da Guarda Municipal e Segurança Pública',
                    'lei_referencia' => 'Lei Municipal nº 2.012/2011 e Lei nº 13.022/2014',
                    'ativo'          => true,
                ]
            );

            $planoSaude = PlanoCarreira::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'codigo' => 'SAUDE'],
                [
                    'nome'           => 'Plano de Carreira dos Profissionais de Saúde Pública',
                    'lei_referencia' => 'Lei Municipal nº 1.940/2009 e Sistema Único de Saúde',
                    'ativo'          => true,
                ]
            );

            // ── 2. Modelo 1: Segurança Pública (SMSP / Guarda Municipal / Agentes de Segurança) ──
            $modeloSeguranca = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo'    => 'FORM_SEGURANCA_V1',
                ],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Segurança Pública',
                    'descricao'         => 'Escala gráfica específica para Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito e Defesa Social.',
                    'plano_carreira_id' => $planoSeguranca->id,
                    'versao'            => 1,
                    'vigencia_inicio'   => '2026-01-01',
                    'grupos'            => [
                        'assiduidade'  => ['nome' => 'Assiduidade e Pontualidade em Escalas', 'peso' => 15.0, 'ordem' => 1],
                        'disciplina'   => ['nome' => 'Disciplina, Hierarquia e Ética Operacional', 'peso' => 20.0, 'ordem' => 2],
                        'competencias' => ['nome' => 'Competências Táticas, Postura e Proteção ao Cidadão', 'peso' => 65.0, 'ordem' => 3],
                    ],
                    'ativo'             => true,
                ]
            );
            $this->criarPerguntasSeguranca($tenantId, $modeloSeguranca->id);
            $this->criarPesosFatoresGenericos($tenantId, $modeloSeguranca->id);

            // ── 3. Modelo 2: Saúde (SMS / Médicos / Enfermagem / Técnicos / ACS / ACE) ──
            $modeloSaude = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo'    => 'FORM_SAUDE_V1',
                ],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Saúde Pública',
                    'descricao'         => 'Escala gráfica para médicos, enfermagem, odontologia, técnicos e agentes de saúde e endemias.',
                    'plano_carreira_id' => $planoSaude->id,
                    'versao'            => 1,
                    'vigencia_inicio'   => '2026-01-01',
                    'grupos'            => [
                        'assiduidade'  => ['nome' => 'Assiduidade e Pontualidade em Plantões/Escalas', 'peso' => 15.0, 'ordem' => 1],
                        'disciplina'   => ['nome' => 'Ética Profissional, Bioética e Sigilo', 'peso' => 15.0, 'ordem' => 2],
                        'competencias' => ['nome' => 'Humanização, Rigor Clínico e Biossegurança', 'peso' => 70.0, 'ordem' => 3],
                    ],
                    'ativo'             => true,
                ]
            );
            $this->criarPerguntasSaude($tenantId, $modeloSaude->id);
            $this->criarPesosFatoresGenericos($tenantId, $modeloSaude->id);

            // ── 4. Modelo 3: Magistério (SMED / Professores / Pedagogos / Educadores) ──
            $modeloMagisterio = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo'    => 'FORM_MAGISTERIO_V1',
                ],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Magistério Municipal',
                    'descricao'         => 'Escala gráfica pedagógica para professores, pedagogos e educadores da rede municipal conforme Lei nº 1.835/2008.',
                    'plano_carreira_id' => $planoMagisterio->id,
                    'versao'            => 1,
                    'vigencia_inicio'   => '2026-01-01',
                    'grupos'            => [
                        'assiduidade'  => ['nome' => 'Assiduidade e Pontualidade no Calendário Letivo', 'peso' => 15.0, 'ordem' => 1],
                        'disciplina'   => ['nome' => 'Cumprimento do Regimento Escolar e Ética Docente', 'peso' => 10.0, 'ordem' => 2],
                        'competencias' => ['nome' => 'Competências Pedagógicas, Didática e Gestão Democrática', 'peso' => 75.0, 'ordem' => 3],
                    ],
                    'ativo'             => true,
                ]
            );
            $this->criarPerguntasMagisterio($tenantId, $modeloMagisterio->id);
            $this->criarPesosFatoresGenericos($tenantId, $modeloMagisterio->id, isMagisterio: true);

            // ── 5. Modelo 4: Quadro Geral (Administrativo / Operacional / Finanças / Obras) ──
            $modeloGeral = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo'    => 'FORM_GERAL_V1',
                ],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Quadro Geral',
                    'descricao'         => 'Escala gráfica com 8 fatores funcionais conforme Lei Municipal nº 1.704/2006.',
                    'plano_carreira_id' => $planoGeral->id,
                    'versao'            => 1,
                    'vigencia_inicio'   => '2026-01-01',
                    'grupos'            => [
                        'assiduidade'  => ['nome' => 'Assiduidade e Pontualidade', 'peso' => 15.0, 'ordem' => 1],
                        'disciplina'   => ['nome' => 'Disciplina e Respeito às Normas', 'peso' => 15.0, 'ordem' => 2],
                        'competencias' => ['nome' => 'Competências e Resultados', 'peso' => 70.0, 'ordem' => 3],
                    ],
                    'ativo'             => true,
                ]
            );
            $this->criarPerguntasGeral($tenantId, $modeloGeral->id);
            $this->criarPesosFatoresGenericos($tenantId, $modeloGeral->id, isMagisterio: false);
        } finally {
            if ($previousTenant) {
                $context->set($previousTenant);
            } else {
                $context->clear();
            }
        }
    }

    private function criarPerguntasSeguranca(int $tenantId, int $modeloId): void
    {
        $perguntas = [
            [
                'codigo'          => 'P1',
                'enunciado'       => 'Assiduidade e Pontualidade em Escala: Regularidade de comparecimento, cumprimento rigoroso dos turnos e rendição de posto.',
                'peso'            => 1.5,
                'grupo_key'       => 'assiduidade',
                'ordem'           => 1,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P2',
                'enunciado'       => 'Disciplina, Hierarquia e Ética Operacional: Respeito à cadeia de comando, cumprimento dos manuais operacionais e zelo pelas diretrizes da corporação.',
                'peso'            => 2.0,
                'grupo_key'       => 'disciplina',
                'ordem'           => 2,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P3',
                'enunciado'       => 'Postura Operacional e Prontidão: Apresentação pessoal, atenção contínua no patrulhamento e prontidão em ocorrências.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 3,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P4',
                'enunciado'       => 'Mediação de Conflitos e Gerenciamento de Crises: Capacidade de conter ânimos com urbanidade, uso progressivo da força e proporcionalidade técnica.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 4,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P5',
                'enunciado'       => 'Trabalho Tático em Equipe: Cooperação com a guarnição, comunicação clara via rádio e suporte recíproco em campo.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 5,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P6',
                'enunciado'       => 'Zelo por Viaturas, Armamento e Bens Públicos: Manutenção preventiva, inspeção de equipamentos e guarda zelosa dos materiais operacionais.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 6,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P7',
                'enunciado'       => 'Atendimento ao Cidadão e Proteção Comunitária: Urbanidade, empatia e eficácia no atendimento aos munícipes e prestação de socorro.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 7,
                'exige_evidencia' => false,
            ],
        ];

        $this->gravarPerguntas($tenantId, $modeloId, $perguntas);
    }

    private function criarPerguntasSaude(int $tenantId, int $modeloId): void
    {
        $perguntas = [
            [
                'codigo'          => 'P1',
                'enunciado'       => 'Assiduidade e Pontualidade em Plantões: Cumprimento dos horários de escala, pontualidade na transição de plantões e permanência na unidade assistencial.',
                'peso'            => 1.5,
                'grupo_key'       => 'assiduidade',
                'ordem'           => 1,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P2',
                'enunciado'       => 'Ética Profissional, Bioética e Sigilo: Observância dos códigos de ética da categoria (CRM/COREN/CRO/CRF) e sigilo absoluto de prontuários.',
                'peso'            => 1.5,
                'grupo_key'       => 'disciplina',
                'ordem'           => 2,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P3',
                'enunciado'       => 'Humanização e Atenção Integral ao Paciente: Acolhimento respeitoso, escuta qualificada, empatia e clareza nas orientações aos usuários do SUS.',
                'peso'            => 2.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 3,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P4',
                'enunciado'       => 'Rigor Técnico e Conformidade com Protocolos Clínicos: Aplicação correta dos fluxos de atendimento, diretrizes clínicas e registro fidedigno em prontuário.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 4,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P5',
                'enunciado'       => 'Atuação Interdisciplinar e Trabalho em Equipe: Articulação com a equipe multiprofissional (médicos, enfermagem, agentes comunitários e administrativos).',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 5,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P6',
                'enunciado'       => 'Biossegurança e Uso Adequado de Medicamentos/Insumos: Cumprimento das normas da Vigilância Sanitária, descarte seguro e uso racional de materiais.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 6,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P7',
                'enunciado'       => 'Resposta em Situações de Urgência e Sobrecarga: Tempestividade na tomada de decisão técnica em momentos de alta demanda ou emergências clínicas.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 7,
                'exige_evidencia' => false,
            ],
        ];

        $this->gravarPerguntas($tenantId, $modeloId, $perguntas);
    }

    private function criarPerguntasMagisterio(int $tenantId, int $modeloId): void
    {
        $perguntas = [
            [
                'codigo'          => 'P1',
                'enunciado'       => 'Assiduidade e Pontualidade no Calendário Letivo: Cumprimento integral dos dias letivos, hora-atividade e pontualidade em sala.',
                'peso'            => 1.5,
                'grupo_key'       => 'assiduidade',
                'ordem'           => 1,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P2',
                'enunciado'       => 'Disciplina e Cumprimento do Regimento Escolar: Observância às diretrizes curriculares municipais, prazos de registros pedagógicos e ética docente.',
                'peso'            => 1.0,
                'grupo_key'       => 'disciplina',
                'ordem'           => 2,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P3',
                'enunciado'       => 'Planejamento Pedagógico e Mediação Didática: Organização prévia das aulas, diversificação metodológica e clareza na exposição do conteúdo.',
                'peso'            => 2.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 3,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P4',
                'enunciado'       => 'Avaliação Formativa e Inclusão Escolar: Acompanhamento individualizado da aprendizagem e adaptação de estratégias para alunos com necessidades específicas.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 4,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P5',
                'enunciado'       => 'Relação com a Comunidade Escolar e Famílias: Urbanidade, atendimento aos responsáveis e engajamento nas reuniões e eventos da escola.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 5,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P6',
                'enunciado'       => 'Trabalho Colaborativo e Gestão Democrática: Participação ativa nos conselhos de classe, projetos coletivos e cooperação pedagógica.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 6,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P7',
                'enunciado'       => 'Formação Continuada e Prática Reflexiva: Participação em cursos de aperfeiçoamento da SMED e autoavaliação da prática educativa.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 7,
                'exige_evidencia' => false,
            ],
        ];

        $this->gravarPerguntas($tenantId, $modeloId, $perguntas);
    }

    private function criarPerguntasGeral(int $tenantId, int $modeloId): void
    {
        $perguntas = [
            [
                'codigo'          => 'P1',
                'enunciado'       => 'Assiduidade e Pontualidade: Cumprimento da jornada regulamentar e assiduidade ao trabalho.',
                'peso'            => 1.5,
                'grupo_key'       => 'assiduidade',
                'ordem'           => 1,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P2',
                'enunciado'       => 'Disciplina e Respeito às Normas: Cumprimento dos deveres estatutários e normas de serviço.',
                'peso'            => 1.5,
                'grupo_key'       => 'disciplina',
                'ordem'           => 2,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P3',
                'enunciado'       => 'Capacidade de Iniciativa: Aptidão para propor soluções e agir proativamente diante de demandas do setor.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 3,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P4',
                'enunciado'       => 'Produtividade e Rendimento: Volume e presteza na execução das atividades com respeito aos prazos.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 4,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P5',
                'enunciado'       => 'Cooperação e Trabalho em Equipe: Espírito colaborativo e relacionamento construtivo no ambiente de trabalho.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 5,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P6',
                'enunciado'       => 'Qualidade do Trabalho Executado: Rigor técnico, exatidão e esmero nas atribuições da função.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 6,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P7',
                'enunciado'       => 'Zelo pelo Patrimônio Público e Economia: Conservação dos equipamentos, economia de recursos e sustentabilidade.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 7,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P8',
                'enunciado'       => 'Atendimento ao Cidadão / Urbanidade: Clareza, eficácia e cortesia no trato com os usuários e colegas de serviço.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 8,
                'exige_evidencia' => false,
            ],
        ];

        $this->gravarPerguntas($tenantId, $modeloId, $perguntas);
    }

    /**
     * @param array<int, array{codigo: string, enunciado: string, peso: float, grupo_key: string, ordem: int, exige_evidencia: bool}> $perguntas
     */
    private function gravarPerguntas(int $tenantId, int $modeloId, array $perguntas): void
    {
        foreach ($perguntas as $f) {
            Pergunta::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'modelo_id' => $modeloId,
                    'codigo'    => $f['codigo'],
                ],
                [
                    'enunciado'           => $f['enunciado'],
                    'tipo'                => Pergunta::TIPO_ESCALA_GRAFICA,
                    'opcoes'              => $this->opcoesEscalaPadrao,
                    'peso'                => $f['peso'],
                    'grupo_key'           => $f['grupo_key'],
                    'ordem'               => $f['ordem'],
                    'obrigatoria'         => true,
                    'exige_evidencia'     => $f['exige_evidencia'],
                    'regras_condicionais' => null,
                    'cargos_permitidos'   => null,
                    'ativo'               => true,
                ]
            );
        }
    }

    private function criarPesosFatoresGenericos(int $tenantId, int $modeloId, bool $isMagisterio = false): void
    {
        $fatores = FatorAvaliacao::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->orderBy('ordem')
            ->get();

        foreach ($fatores as $fator) {
            $pesoOriginal = $isMagisterio ? $fator->peso_magisterio : $fator->peso_geral;

            ModeloFatorPeso::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'modelo_id' => $modeloId,
                    'fator_id'  => $fator->id,
                ],
                [
                    'peso'           => round(((float) $pesoOriginal) * 10, 2),
                    'redistribuivel' => $fator->codigo === 'F8',
                    'ordem'          => $fator->ordem,
                    'ativo'          => true,
                ]
            );
        }
    }
}

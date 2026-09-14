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
 * Converte a metodologia da Escala Gráfica para Avaliação de Desempenho (Chiavenato)
 * para uma estrutura dinâmica de perguntas (F1 a F8) configurável por tenant e plano de carreira.
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
            $planoGeral = PlanoCarreira::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->where('codigo', 'GERAL')
                ->first();
            $planoMagisterio = PlanoCarreira::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->where('codigo', 'MAGISTERIO')
                ->first();

            // 1. Modelo Geral
            $modeloGeral = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'codigo'    => 'FORM_GERAL_V1',
                ],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Quadro Geral',
                    'descricao'         => 'Escala gráfica com 8 fatores funcionais conforme Lei Municipal nº 1.704/2006.',
                    'plano_carreira_id' => $planoGeral?->id,
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

            $this->criarPerguntas($tenantId, $modeloGeral->id, isMagisterio: false);
            $this->criarPesosFatores($tenantId, $modeloGeral->id, isMagisterio: false);

            // 2. Modelo Magistério (se houver plano)
            if ($planoMagisterio) {
                $modeloMagisterio = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'codigo'    => 'FORM_MAGISTERIO_V1',
                    ],
                    [
                        'nome'              => 'Instrumento de Avaliação de Desempenho - Magistério',
                        'descricao'         => 'Escala gráfica com pesos diferenciados para educação conforme Lei nº 1.835/2008.',
                        'plano_carreira_id' => $planoMagisterio->id,
                        'versao'            => 1,
                        'vigencia_inicio'   => '2026-01-01',
                        'grupos'            => [
                            'assiduidade'  => ['nome' => 'Assiduidade e Pontualidade', 'peso' => 15.0, 'ordem' => 1],
                            'disciplina'   => ['nome' => 'Disciplina e Respeito às Normas', 'peso' => 10.0, 'ordem' => 2],
                            'competencias' => ['nome' => 'Competências Pedagógicas e Resultados', 'peso' => 75.0, 'ordem' => 3],
                        ],
                        'ativo'             => true,
                    ]
                );

                $this->criarPerguntas($tenantId, $modeloMagisterio->id, isMagisterio: true);
                $this->criarPesosFatores($tenantId, $modeloMagisterio->id, isMagisterio: true);
            }
        } finally {
            if ($previousTenant) {
                $context->set($previousTenant);
            } else {
                $context->clear();
            }
        }
    }

    private function criarPerguntas(int $tenantId, int $modeloId, bool $isMagisterio): void
    {
        $fatores = [
            [
                'codigo'          => 'P1',
                'enunciado'       => 'Assiduidade e Pontualidade: Cumprimento da jornada de trabalho e assiduidade.',
                'peso'            => 1.5,
                'grupo_key'       => 'assiduidade',
                'ordem'           => 1,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P2',
                'enunciado'       => 'Disciplina e Respeito às Normas: Cumprimento dos deveres estatutários e normas de serviço.',
                'peso'            => $isMagisterio ? 1.0 : 1.5,
                'grupo_key'       => 'disciplina',
                'ordem'           => 2,
                'exige_evidencia' => true,
            ],
            [
                'codigo'          => 'P3',
                'enunciado'       => 'Capacidade de Iniciativa: Aptidão para propor soluções e agir proativamente.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 3,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P4',
                'enunciado'       => 'Responsabilidade e Comprometimento: Zelo com bens públicos e dedicação aos encargos.',
                'peso'            => 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 4,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P5',
                'enunciado'       => 'Cooperação e Trabalho em Equipe: Espírito colaborativo e relacionamento com a unidade.',
                'peso'            => 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 5,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P6',
                'enunciado'       => 'Qualidade do Trabalho Executado: Exatidão técnica, clareza e esmero nas atividades.',
                'peso'            => $isMagisterio ? 2.0 : 1.5,
                'grupo_key'       => 'competencias',
                'ordem'           => 6,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P7',
                'enunciado'       => 'Participação em Programas do DRH: Engajamento em capacitações e ações de aperfeiçoamento.',
                'peso'            => $isMagisterio ? 1.5 : 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 7,
                'exige_evidencia' => false,
            ],
            [
                'codigo'          => 'P8',
                'enunciado'       => 'Atendimento ao Usuário / Cidadão: Urbanidade, presteza e eficácia no atendimento ao público.',
                'peso'            => $isMagisterio ? 0.5 : 1.0,
                'grupo_key'       => 'competencias',
                'ordem'           => 8,
                'exige_evidencia' => false,
            ],
        ];

        foreach ($fatores as $f) {
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

    /**
     * RF-02 — Popula ModeloFatorPeso a partir de FatorAvaliacao.peso_geral/peso_magisterio,
     * escalado para somar 100% (a média ponderada é invariante de escala, então o NFD
     * final não muda: só troca a fonte de onde CalculadoraNotaService lê os pesos).
     *
     * F8 (Atendimento ao Usuário / Cidadão) é o "Fator H" redistribuível (RF-06) para
     * cargos sem atendimento direto ao público.
     */
    private function criarPesosFatores(int $tenantId, int $modeloId, bool $isMagisterio): void
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

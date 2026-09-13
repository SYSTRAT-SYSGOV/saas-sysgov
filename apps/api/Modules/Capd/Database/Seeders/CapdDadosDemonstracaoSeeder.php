<?php

declare(strict_types=1);

namespace Modules\Capd\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Modules\OrgChart\Models\OrgUnit;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\EscalaGrafica;
use Modules\Capd\Models\EscalaNivel;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\ModeloFatorPeso;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Models\PlanoCarreira;
use Modules\Capd\Models\PlanoMelhoria;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;

/**
 * Seeder de Demonstração Completo do Módulo CAPD (SAPDS / SYSGOV).
 *
 * Popula dados realistas e coesos para testar todos os 9 pilares do módulo:
 * 1. Planos de Carreira e Fatores F1 a F8 (Leis nº 1.704/2006 e 1.835/2008)
 * 2. Modelo de Formulário com 8 perguntas na Escala Gráfica de Chiavenato (Graus 1 a 5)
 * 3. Escala Gráfica Dinâmica (3 a 5 níveis contínuos de 0 a 100 pontos)
 * 4. Pesos Individuais por Modelo somando 100% com Fator H redistribuível
 * 5. Organograma (SMAD, SMF, SMED, SMS) e Níveis de Hierarquia
 * 6. Servidores Públicos com chefias imediatas e diferentes situações funcionais
 * 7. Cadência Trienal de Ciclos (2024 Etapa 1, 2025 Etapa 2, 2026 Etapa 3 Trienal)
 * 8. Avaliações com notas de ciclo (Nc), respostas completas e elegibilidade
 * 9. Diário de Bordo (CIT), Comissão CAPD, Recursos e Planos de Melhoria (PMD)
 */
final class CapdDadosDemonstracaoSeeder extends Seeder
{
    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::where('slug', 'araucaria-pr')->orWhere('id', 2)->get();

        if ($tenants->isEmpty()) {
            $tenants = Tenant::where('slug', '!=', 'systrat')->get();
        }

        if ($tenants->isEmpty()) {
            $tenants = Tenant::all();
        }

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return;
        }

        $context = app(TenantContext::class);
        $context->set($tenant);

        echo "==> Semeando dados de teste do CAPD para o Tenant: [{$tenant->id}] {$tenant->name} ({$tenant->slug})\n";

        DB::transaction(function () use ($tenantId, $tenant): void {
            // ── 1. Planos de Carreira ───────────────────────────────────────────
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

            // ── 2. Fatores de Avaliação Canônicos (F1 a F8) ────────────────────
            $fatoresDefs = [
                ['codigo' => 'F1', 'nome' => 'Assiduidade e Pontualidade', 'descricao' => 'Regularidade de frequência e pontualidade na jornada de trabalho.', 'automatizado' => true, 'peso_geral' => 15.0, 'peso_magisterio' => 15.0, 'ordem' => 1],
                ['codigo' => 'F2', 'nome' => 'Disciplina e Respeito às Normas', 'descricao' => 'Observância aos deveres e normas estatutárias e disciplinares.', 'automatizado' => true, 'peso_geral' => 10.0, 'peso_magisterio' => 10.0, 'ordem' => 2],
                ['codigo' => 'F3', 'nome' => 'Capacidade de Iniciativa', 'descricao' => 'Proatividade na resolução de demandas e aperfeiçoamento das rotinas.', 'automatizado' => false, 'peso_geral' => 15.0, 'peso_magisterio' => 15.0, 'ordem' => 3],
                ['codigo' => 'F4', 'nome' => 'Responsabilidade e Comprometimento', 'descricao' => 'Zelo pelo patrimônio público e exação no cumprimento dos encargos.', 'automatizado' => false, 'peso_geral' => 15.0, 'peso_magisterio' => 15.0, 'ordem' => 4],
                ['codigo' => 'F5', 'nome' => 'Cooperação e Trabalho em Equipe', 'descricao' => 'Espírito colaborativo e bom relacionamento interpessoal.', 'automatizado' => false, 'peso_geral' => 10.0, 'peso_magisterio' => 10.0, 'ordem' => 5],
                ['codigo' => 'F6', 'nome' => 'Qualidade e Produtividade', 'descricao' => 'Precisão técnica, presteza e atendimento aos padrões de excelência.', 'automatizado' => false, 'peso_geral' => 20.0, 'peso_magisterio' => 20.0, 'ordem' => 6],
                ['codigo' => 'F7', 'nome' => 'Capacitação e Aperfeiçoamento', 'descricao' => 'Participação em cursos e aplicação dos conhecimentos no trabalho.', 'automatizado' => false, 'peso_geral' => 5.0, 'peso_magisterio' => 5.0, 'ordem' => 7],
                ['codigo' => 'F8', 'nome' => 'Atendimento ao Usuário / Público', 'descricao' => 'Urbanidade, cordialidade e presteza na orientação ao cidadão.', 'automatizado' => false, 'peso_geral' => 10.0, 'peso_magisterio' => 10.0, 'ordem' => 8],
            ];

            $fatoresMap = [];
            foreach ($fatoresDefs as $def) {
                $fator = FatorAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'codigo' => $def['codigo']],
                    $def
                );
                $fatoresMap[$def['codigo']] = $fator;
            }

            // ── 3. Unidades Organizacionais (OrgUnits) ─────────────────────────
            $secAdmin = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMAD'],
                ['name' => 'Secretaria Municipal de Administração', 'type' => 'secretaria', 'level' => 1, 'order' => 1, 'is_active' => true]
            );

            $secFinancas = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMF'],
                ['name' => 'Secretaria Municipal de Finanças', 'type' => 'secretaria', 'level' => 1, 'order' => 2, 'is_active' => true]
            );

            $secEducacao = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMED'],
                ['name' => 'Secretaria Municipal de Educação', 'type' => 'secretaria', 'level' => 1, 'order' => 3, 'is_active' => true]
            );

            $secSaude = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMS'],
                ['name' => 'Secretaria Municipal de Saúde', 'type' => 'secretaria', 'level' => 1, 'order' => 4, 'is_active' => true]
            );

            // Departamentos
            $deptoRh = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMAD-DRH'],
                ['name' => 'Departamento de Recursos Humanos', 'parent_id' => $secAdmin->id, 'type' => 'departamento', 'level' => 2, 'order' => 1, 'is_active' => true]
            );

            $divContab = OrgUnit::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => 'SMF-CONT'],
                ['name' => 'Divisão de Contabilidade Pública', 'parent_id' => $secFinancas->id, 'type' => 'departamento', 'level' => 2, 'order' => 1, 'is_active' => true]
            );

            // ── 4. Níveis de Hierarquia ─────────────────────────────────────────
            NivelHierarquia::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'nivel' => 1],
                ['nome' => 'Secretário Municipal (Topo)', 'cargo_referencia' => 'Secretário Municipal', 'regra_substituicao' => 'substituto_legal', 'is_topo' => true, 'ativo' => true]
            );
            NivelHierarquia::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'nivel' => 2],
                ['nome' => 'Diretor de Departamento', 'cargo_referencia' => 'Diretor', 'regra_substituicao' => 'superior_hierarquico', 'is_topo' => false, 'ativo' => true]
            );
            NivelHierarquia::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'nivel' => 3],
                ['nome' => 'Chefe de Divisão / Coordenador', 'cargo_referencia' => 'Chefe de Divisão', 'regra_substituicao' => 'superior_hierarquico', 'is_topo' => false, 'ativo' => true]
            );

            // ── 5. Modelo de Formulário & Perguntas Dinâmicas ───────────────────
            $modeloGeral = ModeloFormulario::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'codigo' => 'FORM_GERAL_2026'],
                [
                    'nome'              => 'Instrumento de Avaliação de Desempenho - Quadro Geral (2026)',
                    'descricao'         => 'Escala gráfica com 8 fatores funcionais conforme Lei Municipal nº 1.704/2006.',
                    'plano_carreira_id' => $planoGeral->id,
                    'versao'            => 1,
                    'vigencia_inicio'   => '2024-01-01',
                    'grupos'            => [
                        'assiduidade_disciplina' => ['nome' => 'Assiduidade e Disciplina', 'peso' => 25.0, 'ordem' => 1],
                        'competencias_trabalho'  => ['nome' => 'Competências Funcionais',  'peso' => 50.0, 'ordem' => 2],
                        'resultados_atendimento' => ['nome' => 'Resultados e Cidadania',   'peso' => 25.0, 'ordem' => 3],
                    ],
                    'ativo' => true,
                ]
            );

            // Perguntas F1 a F8 na escala Chiavenato (1 a 5)
            $opcoesChiavenato = [
                ['valor' => 1, 'rotulo' => 'Grau 1 - Insuficiente', 'descricao' => 'Desempenho abaixo do padrão exigido, demandando acompanhamento contínuo.'],
                ['valor' => 2, 'rotulo' => 'Grau 2 - Regular',      'descricao' => 'Atende parcialmente aos padrões com necessidades pontuais de aprimoramento.'],
                ['valor' => 3, 'rotulo' => 'Grau 3 - Bom',          'descricao' => 'Atende plenamente a todos os requisitos e encargos habituais da função.'],
                ['valor' => 4, 'rotulo' => 'Grau 4 - Muito Bom',    'descricao' => 'Supera as expectativas habituais com presteza, zelo e dedicação destacada.'],
                ['valor' => 5, 'rotulo' => 'Grau 5 - Excelente',    'descricao' => 'Desempenho exemplar de referência técnica e institucional no órgão.'],
            ];

            $perguntasDefs = [
                ['codigo' => 'F1', 'grupo_key' => 'assiduidade_disciplina', 'peso' => 15.0, 'enunciado' => 'Como você avalia a regularidade de presença, assiduidade e pontualidade do servidor nos horários regulamentares?'],
                ['codigo' => 'F2', 'grupo_key' => 'assiduidade_disciplina', 'peso' => 10.0, 'enunciado' => 'Em que grau o servidor cumpre os deveres estatutários, ordens legítimas e normas de conduta funcional?'],
                ['codigo' => 'F3', 'grupo_key' => 'competencias_trabalho',  'peso' => 15.0, 'enunciado' => 'Qual o grau de iniciativa e capacidade de propor soluções operacionais tempestivas pelo servidor?'],
                ['codigo' => 'F4', 'grupo_key' => 'competencias_trabalho',  'peso' => 15.0, 'enunciado' => 'Como se caracteriza o senso de responsabilidade, zelo com os bens públicos e pontualidade na entrega?'],
                ['codigo' => 'F5', 'grupo_key' => 'competencias_trabalho',  'peso' => 10.0, 'enunciado' => 'Qual o nível de cooperação, espírito de equipe e colaboração com colegas e chefias?'],
                ['codigo' => 'F6', 'grupo_key' => 'competencias_trabalho',  'peso' => 20.0, 'enunciado' => 'Como você avalia a exatidão, produtividade, clareza e qualidade técnica dos trabalhos realizados?'],
                ['codigo' => 'F7', 'grupo_key' => 'resultados_atendimento', 'peso' =>  5.0, 'enunciado' => 'Qual o comprometimento do servidor com seu aperfeiçoamento contínuo e cursos de capacitação?'],
                ['codigo' => 'F8', 'grupo_key' => 'resultados_atendimento', 'peso' => 10.0, 'enunciado' => 'Em que medida o servidor atende os usuários e cidadãos com urbanidade, presteza e respeito?'],
            ];

            foreach ($perguntasDefs as $idx => $pDef) {
                Pergunta::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'modelo_id' => $modeloGeral->id,
                        'codigo'    => $pDef['codigo'],
                    ],
                    [
                        'enunciado'       => $pDef['enunciado'],
                        'tipo'            => 'escala_grafica',
                        'opcoes'          => $opcoesChiavenato,
                        'peso'            => $pDef['peso'],
                        'grupo_key'       => $pDef['grupo_key'],
                        'ordem'           => $idx + 1,
                        'obrigatoria'     => true,
                        'exige_evidencia' => in_array($pDef['codigo'], ['F1', 'F2', 'F6'], true),
                        'ativo'           => true,
                    ]
                );
            }

            // ── 6. Escala Gráfica Dinâmica (RF-03) ──────────────────────────────
            $niveisEscala = [
                ['grau' => 1, 'rotulo' => 'Grau 1 - Insuficiente', 'valor_min' => 0.00,  'valor_max' => 59.99, 'descricao_comportamental' => 'Desempenho abaixo do mínimo aceitável. Enseja Plano de Melhoria de Desempenho (PMD).'],
                ['grau' => 2, 'rotulo' => 'Grau 2 - Regular',      'valor_min' => 60.00, 'valor_max' => 74.99, 'descricao_comportamental' => 'Desempenho básico que necessita de aprimoramento e suporte institucional.'],
                ['grau' => 3, 'rotulo' => 'Grau 3 - Bom',          'valor_min' => 75.00, 'valor_max' => 84.99, 'descricao_comportamental' => 'Desempenho satisfatório, atende plenamente ao padrão esperado.'],
                ['grau' => 4, 'rotulo' => 'Grau 4 - Muito Bom',    'valor_min' => 85.00, 'valor_max' => 94.99, 'descricao_comportamental' => 'Desempenho que supera as expectativas usuais com proatividade destacada.'],
                ['grau' => 5, 'rotulo' => 'Grau 5 - Excelente',    'valor_min' => 95.00, 'valor_max' => 100.00, 'descricao_comportamental' => 'Desempenho exemplar de referência técnica. Exige registro de evidência no CIT.'],
            ];

            // Garante escala gráfica ativa para todos os modelos de formulário do tenant
            $todosModelosTenant = ModeloFormulario::withoutGlobalScope('tenant')->where('tenant_id', $tenantId)->get();
            foreach ($todosModelosTenant as $mMod) {
                $escala = EscalaGrafica::withoutGlobalScope('tenant')->firstOrCreate(
                    ['tenant_id' => $tenantId, 'modelo_id' => $mMod->id],
                    [
                        'nome'       => 'Escala Padrão Chiavenato (5 Graus)',
                        'descricao'  => 'Escala gráfica contínua de 0 a 100 pontos segmentada em 5 graus de desempenho.',
                        'qtd_niveis' => 5,
                        'ativa'      => true,
                    ]
                );

                foreach ($niveisEscala as $nDef) {
                    EscalaNivel::updateOrCreate(
                        ['escala_id' => $escala->id, 'grau' => $nDef['grau']],
                        $nDef
                    );
                }
            }

            // ── 7. Pesos por Formulário com Fator H redistribuível (RF-02/RF-06) ─
            $pesosConfig = [
                'F1' => ['peso' => 15.00, 'redistribuivel' => false],
                'F2' => ['peso' => 10.00, 'redistribuivel' => false],
                'F3' => ['peso' => 15.00, 'redistribuivel' => false],
                'F4' => ['peso' => 15.00, 'redistribuivel' => false],
                'F5' => ['peso' => 10.00, 'redistribuivel' => false],
                'F6' => ['peso' => 20.00, 'redistribuivel' => false],
                'F7' => ['peso' =>  5.00, 'redistribuivel' => false],
                'F8' => ['peso' => 10.00, 'redistribuivel' => true], // Atendimento ao público (redistribuível se sem atendimento)
            ];

            foreach ($todosModelosTenant as $mMod) {
                $ordem = 1;
                foreach ($pesosConfig as $cod => $cfg) {
                    if (isset($fatoresMap[$cod])) {
                        ModeloFatorPeso::withoutGlobalScope('tenant')->updateOrCreate(
                            [
                                'tenant_id' => $tenantId,
                                'modelo_id' => $mMod->id,
                                'fator_id'  => $fatoresMap[$cod]->id,
                            ],
                            [
                                'peso'           => $cfg['peso'],
                                'redistribuivel' => $cfg['redistribuivel'],
                                'ordem'          => $ordem++,
                                'ativo'          => true,
                            ]
                        );
                    }
                }
            }

            // ── 8. Usuários e Chefias ──────────────────────────────────────────
            $senhaPadrao = Hash::make('sysgov@2026');

            $userGestorSmf = User::firstOrCreate(
                ['email' => 'rodrigo.contabilidade@araucaria.pr.gov.br'],
                ['name' => 'Rodrigo Prado Antunes', 'password' => $senhaPadrao]
            );
            $userGestorSmf->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

            $userDiretoraSmad = User::firstOrCreate(
                ['email' => 'beatriz.rh@araucaria.pr.gov.br'],
                ['name' => 'Beatriz Rocha Albuquerque', 'password' => $senhaPadrao]
            );
            $userDiretoraSmad->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

            $userSecFinancas = User::firstOrCreate(
                ['email' => 'leonardo.secretario@araucaria.pr.gov.br'],
                ['name' => 'Dr. Leonardo Mendes Castro', 'password' => $senhaPadrao]
            );
            $userSecFinancas->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

            // Servidores Chefias
            $servidorChefeSmf = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'matricula' => 'CHF-010'],
                [
                    'user_id'               => $userGestorSmf->id,
                    'cpf'                   => '33344455566',
                    'nome_completo'         => 'Rodrigo Prado Antunes',
                    'email'                 => 'rodrigo.contabilidade@araucaria.pr.gov.br',
                    'regime_juridico'       => 'estatutario',
                    'regime_previdenciario' => 'rpps',
                    'data_admissao'         => '2010-03-01',
                    'cargo_efetivo'         => 'Contador Chefe',
                    'funcao_gratificada'    => 'Chefe da Divisão Contábil',
                    'orgao_lotacao'         => 'Secretaria Municipal de Finanças',
                    'org_unit_id'           => $divContab->id,
                    'plano_carreira_id'     => $planoGeral->id,
                    'situacao_funcional'    => 'ativo',
                    'estagio_probatorio'    => false,
                    'carga_horaria_semanal' => 40,
                ]
            );

            $servidorChefeSmad = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'matricula' => 'CHF-020'],
                [
                    'user_id'               => $userDiretoraSmad->id,
                    'cpf'                   => '44455566677',
                    'nome_completo'         => 'Beatriz Rocha Albuquerque',
                    'email'                 => 'beatriz.rh@araucaria.pr.gov.br',
                    'regime_juridico'       => 'estatutario',
                    'regime_previdenciario' => 'rpps',
                    'data_admissao'         => '2008-05-15',
                    'cargo_efetivo'         => 'Analista de RH',
                    'funcao_gratificada'    => 'Diretora do DRH',
                    'orgao_lotacao'         => 'Secretaria Municipal de Administração',
                    'org_unit_id'           => $deptoRh->id,
                    'plano_carreira_id'     => $planoGeral->id,
                    'situacao_funcional'    => 'ativo',
                    'estagio_probatorio'    => false,
                    'carga_horaria_semanal' => 40,
                ]
            );

            // ── 9. Servidores Avaliados (Diversos Cenários de Teste) ─────────────
            $servidoresCenarios = [
                [
                    // Exemplo Canônico do PRD §11.3: Carlos Eduardo Silveira
                    'matricula'       => 'SERV-1001',
                    'cpf'             => '10020030044',
                    'nome'            => 'Carlos Eduardo Silveira',
                    'email'           => 'carlos.silveira@araucaria.pr.gov.br',
                    'data_nascimento' => '1978-05-15',
                    'data_admissao'   => '2014-02-10',
                    'cargo'           => 'Contador',
                    'orgao'           => 'Secretaria Municipal de Finanças',
                    'org_unit_id'     => $divContab->id,
                    'chefia_id'       => $servidorChefeSmf->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '88.50', 2025 => '90.00', 2026 => '89.25'],
                ],
                [
                    // Mariana Souza: Inapta com NFC < 70.00 (Gera PMD)
                    'matricula'       => 'SERV-1002',
                    'cpf'             => '20030040055',
                    'nome'            => 'Mariana Souza Santos',
                    'email'           => 'mariana.santos@araucaria.pr.gov.br',
                    'data_nascimento' => '1988-08-22',
                    'data_admissao'   => '2019-06-14',
                    'cargo'           => 'Assistente Administrativo',
                    'orgao'           => 'Secretaria Municipal de Administração',
                    'org_unit_id'     => $deptoRh->id,
                    'chefia_id'       => $servidorChefeSmad->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '64.00', 2025 => '62.00', 2026 => '60.00'], // NFC = 62.00
                ],
                [
                    // Roberto Alves: Excelente / Nota Máxima (1º do Ranking)
                    'matricula'       => 'SERV-1003',
                    'cpf'             => '30040050066',
                    'nome'            => 'Dr. Roberto Alves Pereira',
                    'email'           => 'roberto.alves@araucaria.pr.gov.br',
                    'data_nascimento' => '1982-11-12',
                    'data_admissao'   => '2016-03-01',
                    'cargo'           => 'Auditor Fiscal',
                    'orgao'           => 'Secretaria Municipal de Finanças',
                    'org_unit_id'     => $secFinancas->id,
                    'chefia_id'       => $servidorChefeSmf->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '95.00', 2025 => '96.00', 2026 => '97.00'], // NFC = 96.00
                ],
                [
                    // Juliana Mendes: Empata com Carlos em NFC e Admissão, mais nova (desempate por idade!)
                    'matricula'       => 'SERV-1004',
                    'cpf'             => '40050060077',
                    'nome'            => 'Juliana Mendes Costa',
                    'email'           => 'juliana.costa@araucaria.pr.gov.br',
                    'data_nascimento' => '1985-09-20', // Mais nova que Carlos (1978)
                    'data_admissao'   => '2014-02-10', // Mesma data de admissão que Carlos
                    'cargo'           => 'Contadora',
                    'orgao'           => 'Secretaria Municipal de Finanças',
                    'org_unit_id'     => $divContab->id,
                    'chefia_id'       => $servidorChefeSmf->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '89.00', 2025 => '89.50', 2026 => '89.25'], // NFC = 89.25 (Empate!)
                ],
                [
                    // Fernando Dias: Em Estágio Probatório (Fase 3)
                    'matricula'       => 'SERV-1005',
                    'cpf'             => '50060070088',
                    'nome'            => 'Fernando Dias Lima',
                    'email'           => 'fernando.dias@araucaria.pr.gov.br',
                    'data_nascimento' => '1995-04-10',
                    'data_admissao'   => '2023-08-01',
                    'cargo'           => 'Técnico em Informática',
                    'orgao'           => 'Secretaria Municipal de Administração',
                    'org_unit_id'     => $secAdmin->id,
                    'chefia_id'       => $servidorChefeSmad->id,
                    'situacao'        => 'ativo',
                    'estagio'         => true,
                    'estagio_fase'    => 3,
                    'notas_ciclos'    => [2024 => '82.00', 2025 => '85.00', 2026 => '86.00'], // NFC = 84.33
                ],
                [
                    // Patrícia Oliveira: Com Licença Médica (Afastamento)
                    'matricula'       => 'SERV-1006',
                    'cpf'             => '60070080099',
                    'nome'            => 'Patrícia Oliveira Lima',
                    'email'           => 'patricia.oliveira@araucaria.pr.gov.br',
                    'data_nascimento' => '1989-01-30',
                    'data_admissao'   => '2021-04-05',
                    'cargo'           => 'Enfermeira Padrão',
                    'orgao'           => 'Secretaria Municipal de Saúde',
                    'org_unit_id'     => $secSaude->id,
                    'chefia_id'       => null,
                    'situacao'        => 'afastado_saude',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '78.00', 2025 => '80.00', 2026 => '81.50'],
                ],
                [
                    // Marcos Vinícius: Com faltas injustificadas no CIT (Inapto por falta)
                    'matricula'       => 'SERV-1007',
                    'cpf'             => '70080090011',
                    'nome'            => 'Marcos Vinícius Rocha',
                    'email'           => 'marcos.rocha@araucaria.pr.gov.br',
                    'data_nascimento' => '1992-07-14',
                    'data_admissao'   => '2022-03-12',
                    'cargo'           => 'Agente Administrativo',
                    'orgao'           => 'Secretaria Municipal de Administração',
                    'org_unit_id'     => $deptoRh->id,
                    'chefia_id'       => $servidorChefeSmad->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '72.00', 2025 => '74.00', 2026 => '73.00'],
                ],
                [
                    // Thiago Henrique: Servidor com Recurso Interposto contra F1
                    'matricula'       => 'SERV-1008',
                    'cpf'             => '80090010022',
                    'nome'            => 'Thiago Henrique Barbosa',
                    'email'           => 'thiago.barbosa@araucaria.pr.gov.br',
                    'data_nascimento' => '1987-12-05',
                    'data_admissao'   => '2017-05-20',
                    'cargo'           => 'Fiscal de Obras e Posturas',
                    'orgao'           => 'Secretaria Municipal de Finanças',
                    'org_unit_id'     => $secFinancas->id,
                    'chefia_id'       => $servidorChefeSmf->id,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '80.00', 2025 => '82.00', 2026 => '79.00'],
                ],
                [
                    // Camila Ferreira: Servidora da Educação
                    'matricula'       => 'SERV-1009',
                    'cpf'             => '90010020033',
                    'nome'            => 'Camila Ferreira Ramos',
                    'email'           => 'camila.ramos@araucaria.pr.gov.br',
                    'data_nascimento' => '1984-03-18',
                    'data_admissao'   => '2015-08-01',
                    'cargo'           => 'Pedagoga',
                    'orgao'           => 'Secretaria Municipal de Educação',
                    'org_unit_id'     => $secEducacao->id,
                    'chefia_id'       => null,
                    'situacao'        => 'ativo',
                    'estagio'         => false,
                    'notas_ciclos'    => [2024 => '91.00', 2025 => '92.50', 2026 => '93.00'], // NFC = 92.17
                ],
            ];

            $servidoresInstancias = [];
            foreach ($servidoresCenarios as $sCen) {
                $u = User::firstOrCreate(
                    ['email' => $sCen['email']],
                    ['name' => $sCen['nome'], 'password' => $senhaPadrao]
                );
                $u->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

                $s = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'matricula' => $sCen['matricula']],
                    [
                        'user_id'               => $u->id,
                        'cpf'                   => $sCen['cpf'],
                        'nome_completo'         => $sCen['nome'],
                        'email'                 => $sCen['email'],
                        'data_nascimento'       => $sCen['data_nascimento'],
                        'data_admissao'         => $sCen['data_admissao'],
                        'regime_juridico'       => 'estatutario',
                        'regime_previdenciario' => 'rpps',
                        'cargo_efetivo'         => $sCen['cargo'],
                        'orgao_lotacao'         => $sCen['orgao'],
                        'org_unit_id'           => $sCen['org_unit_id'],
                        'chefia_imediata_id'    => $sCen['chefia_id'],
                        'plano_carreira_id'     => $planoGeral->id,
                        'situacao_funcional'    => $sCen['situacao'],
                        'estagio_probatorio'    => $sCen['estagio'],
                        'estagio_fase_atual'    => $sCen['estagio_fase'] ?? null,
                        'carga_horaria_semanal' => 40,
                    ]
                );

                $servidoresInstancias[$sCen['matricula']] = [
                    'servidor' => $s,
                    'cenario'  => $sCen,
                ];
            }

            // Registra Afastamento de Patrícia
            $patricia = $servidoresInstancias['SERV-1006']['servidor'];
            ServidorAfastamento::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $patricia->id, 'tipo_afastamento' => 'Licença Tratamento de Saúde'],
                [
                    'data_inicio'        => '2026-03-01',
                    'data_fim'           => '2026-04-15',
                    'dias_afastado'      => 45,
                    'suspende_avaliacao' => false,
                    'observacoes'        => 'Atestado pericial homologado pelo DIMS.',
                ]
            );

            // ── 10. Ciclos de Avaliação (Cadência Trienal 2024 -> 2025 -> 2026) ─
            $ciclo2024 = CicloAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'ano_competencia' => 2024],
                [
                    'nome'                      => 'Ciclo Anual 2024 (1ª Etapa da Cadência)',
                    'data_inicio'               => '2024-01-01',
                    'data_fim'                  => '2024-12-31',
                    'data_limite_preenchimento' => '2024-11-30',
                    'data_limite_recurso'       => '2024-12-15',
                    'status'                    => CicloAvaliacao::STATUS_HOMOLOGADO,
                    'cadencia_automatica'       => true,
                    'etapa_cadencia'            => 1,
                    'nota_corte_nfc'            => '70.00',
                    'quinquenio_percentual'     => '5.00',
                    'regras_config'             => [
                        'dias_preenchimento' => 45,
                        'dias_recurso'       => 15,
                        'intersticio_meses'  => 12,
                    ],
                ]
            );

            $ciclo2025 = CicloAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'ano_competencia' => 2025],
                [
                    'nome'                      => 'Ciclo Anual 2025 (2ª Etapa da Cadência)',
                    'data_inicio'               => '2025-01-01',
                    'data_fim'                  => '2025-12-31',
                    'data_limite_preenchimento' => '2025-11-30',
                    'data_limite_recurso'       => '2025-12-15',
                    'status'                    => CicloAvaliacao::STATUS_HOMOLOGADO,
                    'cadencia_automatica'       => true,
                    'etapa_cadencia'            => 2,
                    'nota_corte_nfc'            => '70.00',
                    'quinquenio_percentual'     => '5.00',
                    'regras_config'             => [
                        'dias_preenchimento' => 45,
                        'dias_recurso'       => 15,
                        'intersticio_meses'  => 12,
                    ],
                ]
            );

            $ciclo2026 = CicloAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'ano_competencia' => 2026],
                [
                    'nome'                      => 'Ciclo Anual 2026 (3ª Etapa - Consolidação Trienal de Progressão)',
                    'data_inicio'               => '2026-01-01',
                    'data_fim'                  => '2026-12-31',
                    'data_limite_preenchimento' => '2026-10-31',
                    'data_limite_recurso'       => '2026-11-15',
                    'status'                    => CicloAvaliacao::STATUS_ABERTO,
                    'cadencia_automatica'       => true,
                    'etapa_cadencia'            => 3,
                    'nota_corte_nfc'            => '70.00',
                    'quinquenio_percentual'     => '5.00',
                    'regras_config'             => [
                        'dias_preenchimento' => 45,
                        'dias_recurso'       => 15,
                        'intersticio_meses'  => 12,
                    ],
                ]
            );

            $ciclosPorAno = [
                2024 => $ciclo2024,
                2025 => $ciclo2025,
                2026 => $ciclo2026,
            ];

            // ── 11. Avaliações com Notas Reais ──────────────────────────────────
            foreach ($servidoresInstancias as $item) {
                $servidor = $item['servidor'];
                $cenario  = $item['cenario'];

                foreach ($cenario['notas_ciclos'] as $ano => $notaStr) {
                    $cicloTarget = $ciclosPorAno[$ano];
                    $avaliadorId = $servidor->chefia_imediata_id ? Servidor::find($servidor->chefia_imediata_id)?->user_id : $userGestorSmf->id;

                    $notaNum = (float) $notaStr;
                    $grau = $notaNum >= 95 ? 5 : ($notaNum >= 85 ? 4 : ($notaNum >= 75 ? 3 : ($notaNum >= 60 ? 2 : 1)));

                    $respostas = [
                        'F1' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F2' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F3' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F4' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F5' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F6' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F7' => ['grau' => $grau, 'pontos' => $notaNum],
                        'F8' => ['grau' => $grau, 'pontos' => $notaNum],
                    ];

                    Avaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                        [
                            'tenant_id'   => $tenantId,
                            'ciclo_id'    => $cicloTarget->id,
                            'servidor_id' => $servidor->user_id,
                        ],
                        [
                            'avaliador_id'        => $avaliadorId,
                            'periodo_inicio'      => "{$ano}-01-01",
                            'periodo_fim'         => "{$ano}-12-31",
                            'dias_exercicio'      => 365,
                            'tipo_avaliacao'      => Avaliacao::TIPO_INTEGRAL,
                            'status_avaliacao'    => Avaliacao::STATUS_ATIVA,
                            'modelo_formulario_id'=> $modeloGeral->id,
                            'respostas_fatores'   => $respostas,
                            'nota_final'          => $notaStr,
                            'elegivel_progressao' => $notaNum >= 70.00,
                            'data_conclusao'      => Carbon::create($ano, 10, 15, 14, 30),
                            'ciencia_servidor_em' => Carbon::create($ano, 10, 20, 10, 0),
                            'homologada'          => $ano < 2026, // 2024 e 2025 homologadas; 2026 pronta para homologar
                            'homologada_em'       => $ano < 2026 ? Carbon::create($ano, 12, 10, 16, 0) : null,
                            'homologada_por'      => $ano < 2026 ? $userSecFinancas->id : null,
                        ]
                    );
                }
            }

            // ── 12. Diário de Bordo (Técnica do Incidente Crítico - CIT) ────────
            $carlos = $servidoresInstancias['SERV-1001']['servidor'];
            $mariana = $servidoresInstancias['SERV-1002']['servidor'];
            $roberto = $servidoresInstancias['SERV-1003']['servidor'];
            $marcos = $servidoresInstancias['SERV-1007']['servidor'];

            // Apontamento Positivo de Carlos (Iniciativa F3)
            DiarioBordo::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $carlos->user_id, 'fator_id' => $fatoresMap['F3']->id, 'data_ocorrencia' => '2026-04-12'],
                [
                    'ciclo_id'            => $ciclo2026->id,
                    'avaliador_id'        => $userGestorSmf->id,
                    'tipo'                => DiarioBordo::TIPO_POSITIVO,
                    'descricao_fato'      => 'Servidor desenvolveu planilha automatizada de conciliação bancária que reduziu em 40% o tempo de fechamento contábil mensal.',
                    'ciencia_servidor_em' => Carbon::now()->subMonths(2),
                ]
            );

            // Apontamento Positivo de Roberto (Qualidade F6)
            DiarioBordo::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $roberto->user_id, 'fator_id' => $fatoresMap['F6']->id, 'data_ocorrencia' => '2026-05-18'],
                [
                    'ciclo_id'            => $ciclo2026->id,
                    'avaliador_id'        => $userGestorSmf->id,
                    'tipo'                => DiarioBordo::TIPO_POSITIVO,
                    'descricao_fato'      => 'Conduziu com elevado rigor técnico ação de fiscalização que resultou na recuperação de R$ 450.000 em créditos tributários inscritos.',
                    'ciencia_servidor_em' => Carbon::now()->subMonths(1),
                ]
            );

            // Apontamento Negativo de Mariana (Qualidade F6)
            DiarioBordo::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $mariana->user_id, 'fator_id' => $fatoresMap['F6']->id, 'data_ocorrencia' => '2026-03-25'],
                [
                    'ciclo_id'            => $ciclo2026->id,
                    'avaliador_id'        => $userDiretoraSmad->id,
                    'tipo'                => DiarioBordo::TIPO_NEGATIVO,
                    'descricao_fato'      => 'Apresentou dificuldades na instrução de processos licitatórios com atrasos reiterados e inconsistências nos termos de referência.',
                    'ciencia_servidor_em' => Carbon::now()->subMonths(3),
                ]
            );

            // Apontamento Negativo de Marcos (Faltas injustificadas F1)
            DiarioBordo::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $marcos->user_id, 'fator_id' => $fatoresMap['F1']->id, 'data_ocorrencia' => '2026-06-10'],
                [
                    'ciclo_id'            => $ciclo2026->id,
                    'avaliador_id'        => $userDiretoraSmad->id,
                    'tipo'                => DiarioBordo::TIPO_NEGATIVO,
                    'descricao_fato'      => 'Registradas 6 faltas injustificadas no primeiro semestre de 2026, ensejando anotação de penalidade funcional.',
                    'ciencia_servidor_em' => Carbon::now()->subWeeks(2),
                ]
            );

            // ── 13. Comissão CAPD & Membros ────────────────────────────────────
            $comissao = Comissao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'numero_portaria' => 'Portaria nº 142/2026'],
                [
                    'ciclo_id'                 => $ciclo2026->id,
                    'data_publicacao_portaria' => '2026-01-10',
                    'ativa'                    => true,
                ]
            );

            $membroPresidente = ComissaoMembro::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'servidor_id' => $servidorChefeSmad->id],
                [
                    'papel'               => ComissaoMembro::PAPEL_PRESIDENTE,
                    'ativo'               => true,
                    'data_inicio_mandato' => '2026-01-10',
                    'data_fim_mandato'    => '2027-01-09',
                ]
            );

            $membroRelator = ComissaoMembro::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'servidor_id' => $servidorChefeSmf->id],
                [
                    'papel'               => ComissaoMembro::PAPEL_TITULAR_GESTAO,
                    'ativo'               => true,
                    'data_inicio_mandato' => '2026-01-10',
                    'data_fim_mandato'    => '2027-01-09',
                ]
            );

            // ── 14. Recurso Administrativo (Para testar painel de recursos) ────
            $thiago = $servidoresInstancias['SERV-1008']['servidor'];
            $avaliacaoThiago = Avaliacao::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->where('ciclo_id', $ciclo2026->id)
                ->where('servidor_id', $thiago->user_id)
                ->first();

            if ($avaliacaoThiago) {
                Recurso::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id'           => $tenantId,
                        'avaliacao_id'        => $avaliacaoThiago->id,
                        'fator_contestado_id' => $fatoresMap['F1']->id,
                    ],
                    [
                        'recorrente_id'          => $thiago->user_id,
                        'justificativa_servidor' => 'Contesto a pontuação atribuída no Fator F1 (Assiduidade), pois apresentei atestado tempestivo referente aos dias 14 e 15 de março.',
                        'status'                 => Recurso::STATUS_EM_INSTRUCAO,
                        'relator_id'             => $membroRelator->id,
                        'prazo_relator_ate'      => Carbon::now()->addDays(7),
                        'contestacao_chefia'     => 'Chefia informa que o atestado foi protocolado após o encerramento do prazo regulamentar.',
                        'contestacao_em'         => Carbon::now()->subDays(2),
                    ]
                );
            }

            // ── 15. Plano de Melhoria de Desempenho (PMD Histórico) ────────────
            PlanoMelhoria::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'servidor_id' => $mariana->id, 'ciclo_id' => $ciclo2025->id],
                [
                    'ciclo_verificacao_id'    => $ciclo2026->id,
                    'nfc_gatilho'             => '62.00',
                    'objetivos'               => 'Capacitação específica em instrução de processos administrativos, gestão de contratos e redação oficial.',
                    'acoes'                   => '1. Concluir curso da Escola de Governo sobre Licitações (30h);\n2. Tutoria quinzenal com a Diretoria do DRH.',
                    'prazo'                   => '2026-10-31',
                    'status'                  => PlanoMelhoria::STATUS_EM_ANDAMENTO,
                    'observacoes_verificacao' => 'Acompanhamento do 1º trimestre realizado: servidora matriculada no curso.',
                ]
            );
        });

        echo "==> Módulo CAPD semeado com sucesso para o Tenant {$tenant->name}!\n";
    }
}

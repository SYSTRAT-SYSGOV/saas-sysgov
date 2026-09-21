<?php

declare(strict_types=1);

namespace Modules\Capd\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
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
use Modules\Capd\Models\Sessao;
use Modules\Capd\Models\SessaoPauta;

/**
 * Seeder de Demonstração Completo do Módulo CAPD (SAPDS / SYSGOV).
 *
 * Popula a base de dados com a estrutura institucional completa:
 * - 5 Secretarias Municipais (SMAD, SMF, SMED, SMS, SMOSP)
 * - 10 Departamentos (2 em cada Secretaria)
 * - 15 Chefias (5 Secretários + 10 Diretores de Departamento)
 * - 50 Servidores Operacionais (5 em cada Departamento) com vínculos hierárquicos reais
 * - Avaliações completas para os 50 servidores nos 3 ciclos da cadência (2024, 2025 e 2026)
 * - Incidentes no Diário de Bordo (CIT) justificando notas extremas (<60 ou >90)
 * - Recursos administrativos em múltiplos status (interposto, instrução, pautado, deferido, indeferido)
 * - Sessões plenárias da Comissão CAD com quórum e atas com selo SHA-256
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

        echo "==> Semeando estrutura organizacional completa do CAPD para o Tenant: [{$tenant->id}] {$tenant->name} ({$tenant->slug})\n";

        DB::transaction(function () use ($tenantId): void {
            $senhaPadrao = Hash::make('sysgov@2026');

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
                ['codigo' => 'F1', 'nome' => 'Assiduidade e Pontualidade',          'descricao' => 'Regularidade de comparecimento e observância dos horários regulamentares.', 'automatizado' => false, 'peso_geral' => 15.00, 'peso_magisterio' => 10.00, 'ordem' => 1, 'ativo' => true],
                ['codigo' => 'F2', 'nome' => 'Disciplina e Ética Funcional',        'descricao' => 'Cumprimento dos deveres estatutários, conduta ética e respeito à hierarquia.', 'automatizado' => false, 'peso_geral' => 10.00, 'peso_magisterio' => 10.00, 'ordem' => 2, 'ativo' => true],
                ['codigo' => 'F3', 'nome' => 'Capacidade de Iniciativa',            'descricao' => 'Aptidão para identificar demandas e apresentar soluções operacionais tempestivas.', 'automatizado' => false, 'peso_geral' => 15.00, 'peso_magisterio' => 15.00, 'ordem' => 3, 'ativo' => true],
                ['codigo' => 'F4', 'nome' => 'Produtividade e Eficiência',          'descricao' => 'Volume de trabalho produzido com economia de recursos e atendimento aos prazos.', 'automatizado' => false, 'peso_geral' => 15.00, 'peso_magisterio' => 15.00, 'ordem' => 4, 'ativo' => true],
                ['codigo' => 'F5', 'nome' => 'Relacionamento Interpessoal',         'descricao' => 'Espírito de cooperação, urbanidade e trabalho em equipe no serviço público.', 'automatizado' => false, 'peso_geral' => 10.00, 'peso_magisterio' => 15.00, 'ordem' => 5, 'ativo' => true],
                ['codigo' => 'F6', 'nome' => 'Qualidade Técnica do Trabalho',       'descricao' => 'Exatidão, rigor metodológico e conformidade com as normas regulamentares.', 'automatizado' => false, 'peso_geral' => 20.00, 'peso_magisterio' => 20.00, 'ordem' => 6, 'ativo' => true],
                ['codigo' => 'F7', 'nome' => 'Aperfeiçoamento Profissional',        'descricao' => 'Participação em capacitações institucionais e autoaperfeiçoamento funcional.', 'automatizado' => false, 'peso_geral' =>  5.00, 'peso_magisterio' =>  5.00, 'ordem' => 7, 'ativo' => true],
                ['codigo' => 'F8', 'nome' => 'Atendimento ao Cidadão / Urbanidade', 'descricao' => 'Presteza, respeito e clareza no atendimento direto aos usuários do serviço.', 'automatizado' => false, 'peso_geral' => 10.00, 'peso_magisterio' => 10.00, 'ordem' => 8, 'ativo' => true],
            ];

            $fatoresMap = [];
            foreach ($fatoresDefs as $def) {
                $fator = FatorAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'codigo' => $def['codigo']],
                    $def
                );
                $fatoresMap[$def['codigo']] = $fator;
            }

            // ── 3. Unidades Organizacionais: 5 Secretarias e 10 Departamentos ──
            $secretariasData = [
                ['code' => 'SMAD',  'name' => 'Secretaria Municipal de Administração',                  'order' => 1],
                ['code' => 'SMF',   'name' => 'Secretaria Municipal de Finanças e Orçamento',           'order' => 2],
                ['code' => 'SMED',  'name' => 'Secretaria Municipal de Educação',                       'order' => 3],
                ['code' => 'SMS',   'name' => 'Secretaria Municipal de Saúde',                          'order' => 4],
                ['code' => 'SMOSP', 'name' => 'Secretaria Municipal de Obras e Serviços Públicos',     'order' => 5],
            ];

            $secretariasMap = [];
            foreach ($secretariasData as $sData) {
                $sec = OrgUnit::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'code' => $sData['code']],
                    [
                        'name'      => $sData['name'],
                        'type'      => 'secretaria',
                        'level'     => 1,
                        'order'     => $sData['order'],
                        'is_active' => true,
                    ]
                );
                $secretariasMap[$sData['code']] = $sec;
            }

            $departamentosData = [
                // SMAD
                ['code' => 'SMAD-DRH',  'name' => 'Departamento de Recursos Humanos e Gestão de Pessoas', 'parent' => 'SMAD',  'order' => 1],
                ['code' => 'SMAD-DLOG', 'name' => 'Departamento de Logística, Frotas e Patrimônio',      'parent' => 'SMAD',  'order' => 2],
                // SMF
                ['code' => 'SMF-CONT',  'name' => 'Departamento de Contabilidade e Finanças',            'parent' => 'SMF',   'order' => 1],
                ['code' => 'SMF-TRIB',  'name' => 'Departamento de Arrecadação e Fiscalização Tributária', 'parent' => 'SMF',   'order' => 2],
                // SMED
                ['code' => 'SMED-DEP',  'name' => 'Departamento de Ensino Fundamental e Pedagógico',      'parent' => 'SMED',  'order' => 1],
                ['code' => 'SMED-DGA',  'name' => 'Departamento de Gestão Administrativa Escolar',        'parent' => 'SMED',  'order' => 2],
                // SMS
                ['code' => 'SMS-DAS',   'name' => 'Departamento de Atenção Básica e Saúde da Família',    'parent' => 'SMS',   'order' => 1],
                ['code' => 'SMS-DVS',   'name' => 'Departamento de Vigilância em Saúde e Epidemiologia',  'parent' => 'SMS',   'order' => 2],
                // SMOSP
                ['code' => 'SMOSP-DOP', 'name' => 'Departamento de Obras Públicas e Infraestrutura',     'parent' => 'SMOSP', 'order' => 1],
                ['code' => 'SMOSP-DSU', 'name' => 'Departamento de Serviços Urbanos e Manutenção Viária', 'parent' => 'SMOSP', 'order' => 2],
            ];

            $departamentosMap = [];
            foreach ($departamentosData as $dData) {
                $dep = OrgUnit::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'code' => $dData['code']],
                    [
                        'name'      => $dData['name'],
                        'parent_id' => $secretariasMap[$dData['parent']]->id,
                        'type'      => 'departamento',
                        'level'     => 2,
                        'order'     => $dData['order'],
                        'is_active' => true,
                    ]
                );
                $departamentosMap[$dData['code']] = $dep;
            }

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
                ['codigo' => 'F4', 'grupo_key' => 'competencias_trabalho',  'peso' => 15.0, 'enunciado' => 'Como se caracteriza o volume de trabalho entregue, eficiência no uso dos recursos e pontualidade na entrega?'],
                ['codigo' => 'F5', 'grupo_key' => 'competencias_trabalho',  'peso' => 10.0, 'enunciado' => 'Qual o nível de cooperação, espírito de equipe e colaboração com colegas e chefias?'],
                ['codigo' => 'F6', 'grupo_key' => 'competencias_trabalho',  'peso' => 20.0, 'enunciado' => 'Como você avalia a exatidão, rigor metodológico, clareza e qualidade técnica dos trabalhos realizados?'],
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

            // Escala Gráfica Dinâmica
            $niveisEscala = [
                ['grau' => 1, 'rotulo' => 'Grau 1 - Insuficiente', 'valor_min' => 0.00,  'valor_max' => 59.99, 'descricao_comportamental' => 'Desempenho abaixo do mínimo aceitável. Enseja Plano de Melhoria de Desempenho (PMD).'],
                ['grau' => 2, 'rotulo' => 'Grau 2 - Regular',      'valor_min' => 60.00, 'valor_max' => 74.99, 'descricao_comportamental' => 'Desempenho básico que necessita de aprimoramento e suporte institucional.'],
                ['grau' => 3, 'rotulo' => 'Grau 3 - Bom',          'valor_min' => 75.00, 'valor_max' => 84.99, 'descricao_comportamental' => 'Desempenho satisfatório, atende plenamente ao padrão esperado.'],
                ['grau' => 4, 'rotulo' => 'Grau 4 - Muito Bom',    'valor_min' => 85.00, 'valor_max' => 94.99, 'descricao_comportamental' => 'Desempenho que supera as expectativas usuais com proatividade destacada.'],
                ['grau' => 5, 'rotulo' => 'Grau 5 - Excelente',    'valor_min' => 95.00, 'valor_max' => 100.00, 'descricao_comportamental' => 'Desempenho exemplar de referência técnica. Exige registro de evidência no CIT.'],
            ];

            $escala = EscalaGrafica::withoutGlobalScope('tenant')->firstOrCreate(
                ['tenant_id' => $tenantId, 'modelo_id' => $modeloGeral->id],
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

            // Pesos
            $pesosConfig = [
                'F1' => ['peso' => 15.00, 'redistribuivel' => false],
                'F2' => ['peso' => 10.00, 'redistribuivel' => false],
                'F3' => ['peso' => 15.00, 'redistribuivel' => false],
                'F4' => ['peso' => 15.00, 'redistribuivel' => false],
                'F5' => ['peso' => 10.00, 'redistribuivel' => false],
                'F6' => ['peso' => 20.00, 'redistribuivel' => false],
                'F7' => ['peso' =>  5.00, 'redistribuivel' => false],
                'F8' => ['peso' => 10.00, 'redistribuivel' => true],
            ];

            $ordem = 1;
            foreach ($pesosConfig as $cod => $cfg) {
                if (isset($fatoresMap[$cod])) {
                    ModeloFatorPeso::withoutGlobalScope('tenant')->updateOrCreate(
                        [
                            'tenant_id' => $tenantId,
                            'modelo_id' => $modeloGeral->id,
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

            // ── 6. Chefias: 5 Secretários e 10 Diretores de Departamento ───────
            $secretariosDefs = [
                'SMAD'  => ['nome' => 'Dr. Paulo Roberto Guimarães',       'email' => 'paulo.guimaraes@araucaria.pr.gov.br',   'matricula' => 'SEC-001', 'cpf' => '01122233344'],
                'SMF'   => ['nome' => 'Dra. Helena Vasconcellos Moura',     'email' => 'helena.moura@araucaria.pr.gov.br',      'matricula' => 'SEC-002', 'cpf' => '02233344455'],
                'SMED'  => ['nome' => 'Profa. Maria Aparecida Diniz',      'email' => 'maria.diniz@araucaria.pr.gov.br',       'matricula' => 'SEC-003', 'cpf' => '03344455566'],
                'SMS'   => ['nome' => 'Dr. Fernando Siqueira Prado',       'email' => 'fernando.prado@araucaria.pr.gov.br',    'matricula' => 'SEC-004', 'cpf' => '04455566677'],
                'SMOSP' => ['nome' => 'Eng. Rogério Antunes Maciel',       'email' => 'rogerio.maciel@araucaria.pr.gov.br',    'matricula' => 'SEC-005', 'cpf' => '05566677788'],
            ];

            $secretariosServidores = [];
            foreach ($secretariosDefs as $secCode => $secData) {
                $userSec = User::firstOrCreate(
                    ['email' => $secData['email']],
                    ['name' => $secData['nome'], 'password' => $senhaPadrao]
                );
                $userSec->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

                $servSec = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'matricula' => $secData['matricula']],
                    [
                        'user_id'               => $userSec->id,
                        'cpf'                   => $secData['cpf'],
                        'nome_completo'         => $secData['nome'],
                        'email'                 => $secData['email'],
                        'regime_juridico'       => 'comissionado',
                        'regime_previdenciario' => 'rgps',
                        'data_admissao'         => '2021-01-01',
                        'cargo_efetivo'         => 'Secretário Municipal',
                        'funcao_gratificada'    => 'Secretário de Pasta',
                        'orgao_lotacao'         => $secretariasMap[$secCode]->name,
                        'org_unit_id'           => $secretariasMap[$secCode]->id,
                        'plano_carreira_id'     => $planoGeral->id,
                        'situacao_funcional'    => 'ativo',
                        'estagio_probatorio'    => false,
                        'carga_horaria_semanal' => 40,
                    ]
                );
                $secretariosServidores[$secCode] = $servSec;

                OrgUnitUser::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id'   => $tenantId,
                        'org_unit_id' => $secretariasMap[$secCode]->id,
                        'user_id'     => $userSec->id,
                    ],
                    [
                        'role'       => 'responsavel',
                        'is_primary' => true,
                        'valid_from' => '2021-01-01',
                    ]
                );
            }

            $diretoresDefs = [
                'SMAD-DRH'  => ['nome' => 'Beatriz Rocha Albuquerque',      'email' => 'beatriz.rh@araucaria.pr.gov.br',       'matricula' => 'DIR-001', 'cpf' => '11122233344', 'cargo' => 'Analista de RH',        'sec' => 'SMAD'],
                'SMAD-DLOG' => ['nome' => 'Cláudio Márcio Fonseca',         'email' => 'claudio.fonseca@araucaria.pr.gov.br',  'matricula' => 'DIR-002', 'cpf' => '12233344455', 'cargo' => 'Especialista Logístico', 'sec' => 'SMAD'],
                'SMF-CONT'  => ['nome' => 'Rodrigo Prado Antunes',          'email' => 'rodrigo.cont@araucaria.pr.gov.br',     'matricula' => 'DIR-003', 'cpf' => '13344455566', 'cargo' => 'Contador Geral',        'sec' => 'SMF'],
                'SMF-TRIB'  => ['nome' => 'Patrícia Lins Cavalcanti',       'email' => 'patricia.trib@araucaria.pr.gov.br',    'matricula' => 'DIR-004', 'cpf' => '14455566677', 'cargo' => 'Auditora Fiscal Chefe',  'sec' => 'SMF'],
                'SMED-DEP'  => ['nome' => 'Sandra Valéria Nogueira',        'email' => 'sandra.nogueira@araucaria.pr.gov.br',  'matricula' => 'DIR-005', 'cpf' => '15566677788', 'cargo' => 'Pedagoga Coordenadora',  'sec' => 'SMED'],
                'SMED-DGA'  => ['nome' => 'Valmir Ferreira Sobrinho',       'email' => 'valmir.sobrinho@araucaria.pr.gov.br',  'matricula' => 'DIR-006', 'cpf' => '16677788899', 'cargo' => 'Gestor Escolar',        'sec' => 'SMED'],
                'SMS-DAS'   => ['nome' => 'Dr. Luciano Meireles Cordeiro',  'email' => 'luciano.cordeiro@araucaria.pr.gov.br', 'matricula' => 'DIR-007', 'cpf' => '17788899900', 'cargo' => 'Médico Coordenador',    'sec' => 'SMS'],
                'SMS-DVS'   => ['nome' => 'Camila Fontana Vianna',          'email' => 'camila.vianna@araucaria.pr.gov.br',    'matricula' => 'DIR-008', 'cpf' => '18899900011', 'cargo' => 'Especialista Sanitária', 'sec' => 'SMS'],
                'SMOSP-DOP' => ['nome' => 'Eng. Eduardo Henrique Batista',  'email' => 'eduardo.batista@araucaria.pr.gov.br',  'matricula' => 'DIR-009', 'cpf' => '19900011122', 'cargo' => 'Engenheiro Chefe Obras', 'sec' => 'SMOSP'],
                'SMOSP-DSU' => ['nome' => 'Sérgio Murilo Rezende',          'email' => 'sergio.rezende@araucaria.pr.gov.br',   'matricula' => 'DIR-010', 'cpf' => '20011122233', 'cargo' => 'Diretor de Serviços',    'sec' => 'SMOSP'],
            ];

            $diretoresServidores = [];
            foreach ($diretoresDefs as $depCode => $dirData) {
                $userDir = User::firstOrCreate(
                    ['email' => $dirData['email']],
                    ['name' => $dirData['nome'], 'password' => $senhaPadrao]
                );
                $userDir->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

                $servDir = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'matricula' => $dirData['matricula']],
                    [
                        'user_id'               => $userDir->id,
                        'cpf'                   => $dirData['cpf'],
                        'nome_completo'         => $dirData['nome'],
                        'email'                 => $dirData['email'],
                        'regime_juridico'       => 'estatutario',
                        'regime_previdenciario' => 'rpps',
                        'data_admissao'         => '2012-04-10',
                        'cargo_efetivo'         => $dirData['cargo'],
                        'funcao_gratificada'    => 'Diretor de Departamento',
                        'orgao_lotacao'         => $secretariasMap[$dirData['sec']]->name,
                        'org_unit_id'           => $departamentosMap[$depCode]->id,
                        'chefia_imediata_id'    => $secretariosServidores[$dirData['sec']]->id,
                        'plano_carreira_id'     => str_contains($depCode, 'SMED') ? $planoMagisterio->id : $planoGeral->id,
                        'situacao_funcional'    => 'ativo',
                        'estagio_probatorio'    => false,
                        'carga_horaria_semanal' => 40,
                    ]
                );
                $diretoresServidores[$depCode] = $servDir;

                OrgUnitUser::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id'   => $tenantId,
                        'org_unit_id' => $departamentosMap[$depCode]->id,
                        'user_id'     => $userDir->id,
                    ],
                    [
                        'role'       => 'responsavel',
                        'is_primary' => true,
                        'valid_from' => '2012-04-10',
                    ]
                );
            }

            // ── 7. 50 Servidores Operacionais (5 em cada Departamento) ─────────
            $servidoresOperacionaisDefs = [
                // ── SMAD-DRH (5 Servidores)
                [
                    'mat' => 'SERV-1001', 'cpf' => '10020030044', 'nome' => 'Carlos Eduardo Silveira', 'email' => 'carlos.silveira@araucaria.pr.gov.br',
                    'cargo' => 'Contador', 'dep' => 'SMAD-DRH', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '88.50', 2025 => '90.00', 2026 => '89.25'],
                ],
                [
                    'mat' => 'SERV-1002', 'cpf' => '20030040055', 'nome' => 'Mariana Souza Santos', 'email' => 'mariana.santos@araucaria.pr.gov.br',
                    'cargo' => 'Assistente Administrativo', 'dep' => 'SMAD-DRH', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '64.00', 2025 => '62.00', 2026 => '60.00'], // Gera PMD
                ],
                [
                    'mat' => 'SERV-1011', 'cpf' => '31142253366', 'nome' => 'Fernanda Gomes Ribeiro', 'email' => 'fernanda.ribeiro@araucaria.pr.gov.br',
                    'cargo' => 'Técnica em Gestão Pública', 'dep' => 'SMAD-DRH', 'estagio' => true, 'estagio_fase' => 3, 'situacao' => 'ativo',
                    'notas' => [2024 => '84.00', 2025 => '86.00', 2026 => '87.50'],
                ],
                [
                    'mat' => 'SERV-1012', 'cpf' => '42253364477', 'nome' => 'Marcelo Vieira Couto', 'email' => 'marcelo.couto@araucaria.pr.gov.br',
                    'cargo' => 'Assistente de Pessoal', 'dep' => 'SMAD-DRH', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '78.00', 2025 => '81.00', 2026 => '82.00'],
                ],
                [
                    'mat' => 'SERV-1013', 'cpf' => '53364475588', 'nome' => 'Amanda Cristine Prado', 'email' => 'amanda.prado@araucaria.pr.gov.br',
                    'cargo' => 'Psicóloga Organizacional', 'dep' => 'SMAD-DRH', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '92.00', 2025 => '94.50', 2026 => '95.00'], // Excelência
                ],

                // ── SMAD-DLOG (5 Servidores)
                [
                    'mat' => 'SERV-1014', 'cpf' => '64475586699', 'nome' => 'Jorge Lucas Medeiros', 'email' => 'jorge.medeiros@araucaria.pr.gov.br',
                    'cargo' => 'Agente de Suprimentos', 'dep' => 'SMAD-DLOG', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '76.00', 2025 => '78.00', 2026 => '80.00'],
                ],
                [
                    'mat' => 'SERV-1015', 'cpf' => '75586697700', 'nome' => 'Renata Vasconcelos Brito', 'email' => 'renata.brito@araucaria.pr.gov.br',
                    'cargo' => 'Analista de Frotas', 'dep' => 'SMAD-DLOG', 'estagio' => true, 'estagio_fase' => 2, 'situacao' => 'ativo',
                    'notas' => [2024 => '83.00', 2025 => '85.00', 2026 => '86.50'],
                ],
                [
                    'mat' => 'SERV-1007', 'cpf' => '70080090011', 'nome' => 'Marcos Vinícius Rocha', 'email' => 'marcos.rocha@araucaria.pr.gov.br',
                    'cargo' => 'Agente Administrativo', 'dep' => 'SMAD-DLOG', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '72.00', 2025 => '74.00', 2026 => '73.00'],
                ],
                [
                    'mat' => 'SERV-1016', 'cpf' => '86697708811', 'nome' => 'Luciana Paes de Barros', 'email' => 'luciana.barros@araucaria.pr.gov.br',
                    'cargo' => 'Assistente de Almoxarifado', 'dep' => 'SMAD-DLOG', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '88.00', 2025 => '89.00', 2026 => '90.50'],
                ],
                [
                    'mat' => 'SERV-1017', 'cpf' => '97708819922', 'nome' => 'Gilberto Silva Santos', 'email' => 'gilberto.santos@araucaria.pr.gov.br',
                    'cargo' => 'Técnico em Logística', 'dep' => 'SMAD-DLOG', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '79.00', 2025 => '80.50', 2026 => '81.00'],
                ],

                // ── SMF-CONT (5 Servidores)
                [
                    'mat' => 'SERV-1018', 'cpf' => '18829930033', 'nome' => 'Daniela Brandão Pires', 'email' => 'daniela.pires@araucaria.pr.gov.br',
                    'cargo' => 'Contadora Pública', 'dep' => 'SMF-CONT', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '91.00', 2025 => '93.00', 2026 => '94.00'],
                ],
                [
                    'mat' => 'SERV-1019', 'cpf' => '29930041144', 'nome' => 'Robson Teixeira Lima', 'email' => 'robson.lima@araucaria.pr.gov.br',
                    'cargo' => 'Técnico Contábil', 'dep' => 'SMF-CONT', 'estagio' => true, 'estagio_fase' => 1, 'situacao' => 'ativo',
                    'notas' => [2024 => '75.00', 2025 => '78.00', 2026 => '80.00'],
                ],
                [
                    'mat' => 'SERV-1008', 'cpf' => '80090010022', 'nome' => 'Thiago Henrique Barbosa', 'email' => 'thiago.barbosa@araucaria.pr.gov.br',
                    'cargo' => 'Fiscal Financeiro', 'dep' => 'SMF-CONT', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '79.00', 2025 => '81.00', 2026 => '82.00'], // Recurso 1
                ],
                [
                    'mat' => 'SERV-1020', 'cpf' => '41152263366', 'nome' => 'Priscila Mello Carneiro', 'email' => 'priscila.carneiro@araucaria.pr.gov.br',
                    'cargo' => 'Analista Financeiro', 'dep' => 'SMF-CONT', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '85.00', 2025 => '87.00', 2026 => '88.50'],
                ],
                [
                    'mat' => 'SERV-1021', 'cpf' => '52263374477', 'nome' => 'Valter Fagundes Ramos', 'email' => 'valter.ramos@araucaria.pr.gov.br',
                    'cargo' => 'Assistente Orçamentário', 'dep' => 'SMF-CONT', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '71.00', 2025 => '73.00', 2026 => '74.00'],
                ],

                // ── SMF-TRIB (5 Servidores)
                [
                    'mat' => 'SERV-1003', 'cpf' => '30040050066', 'nome' => 'Dr. Roberto Alves Pereira', 'email' => 'roberto.alves@araucaria.pr.gov.br',
                    'cargo' => 'Auditor Fiscal Tributário', 'dep' => 'SMF-TRIB', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '98.00', 2025 => '99.00', 2026 => '99.50'], // 1º do Ranking
                ],
                [
                    'mat' => 'SERV-1022', 'cpf' => '63374485588', 'nome' => 'Simone Helena Duarte', 'email' => 'simone.duarte@araucaria.pr.gov.br',
                    'cargo' => 'Auditora Tributária', 'dep' => 'SMF-TRIB', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '94.00', 2025 => '95.00', 2026 => '96.00'],
                ],
                [
                    'mat' => 'SERV-1023', 'cpf' => '74485596699', 'nome' => 'César Augusto Meira', 'email' => 'cesar.meira@araucaria.pr.gov.br',
                    'cargo' => 'Técnico de Tributação', 'dep' => 'SMF-TRIB', 'estagio' => true, 'estagio_fase' => 3, 'situacao' => 'ativo',
                    'notas' => [2024 => '86.00', 2025 => '88.00', 2026 => '89.00'],
                ],
                [
                    'mat' => 'SERV-1024', 'cpf' => '85596607700', 'nome' => 'Bruna Koster Viana', 'email' => 'bruna.viana@araucaria.pr.gov.br',
                    'cargo' => 'Assistente de Arrecadação', 'dep' => 'SMF-TRIB', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '82.00', 2025 => '83.50', 2026 => '85.00'],
                ],
                [
                    'mat' => 'SERV-1025', 'cpf' => '96607718811', 'nome' => 'Fábio Nascimento Leite', 'email' => 'fabio.leite@araucaria.pr.gov.br',
                    'cargo' => 'Fiscal Tributário', 'dep' => 'SMF-TRIB', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '80.00', 2025 => '82.00', 2026 => '81.50'], // Recurso 2
                ],

                // ── SMED-DEP (5 Servidores)
                [
                    'mat' => 'SERV-1004', 'cpf' => '40050060077', 'nome' => 'Ana Paula Fernandes', 'email' => 'ana.fernandes@araucaria.pr.gov.br',
                    'cargo' => 'Pedagoga', 'dep' => 'SMED-DEP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '89.00', 2025 => '91.50', 2026 => '92.00'],
                ],
                [
                    'mat' => 'SERV-1005', 'cpf' => '50060070088', 'nome' => 'Juliana Castro Moreira', 'email' => 'juliana.moreira@araucaria.pr.gov.br',
                    'cargo' => 'Professora Fundamental', 'dep' => 'SMED-DEP', 'estagio' => true, 'estagio_fase' => 3, 'situacao' => 'ativo',
                    'notas' => [2024 => '82.00', 2025 => '85.00', 2026 => '86.00'],
                ],
                [
                    'mat' => 'SERV-1026', 'cpf' => '17728839922', 'nome' => 'Marcos Vinicius Cordeiro', 'email' => 'marcos.cordeiro@araucaria.pr.gov.br',
                    'cargo' => 'Professor de Matemática', 'dep' => 'SMED-DEP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '87.00', 2025 => '89.00', 2026 => '90.00'],
                ],
                [
                    'mat' => 'SERV-1027', 'cpf' => '28839940033', 'nome' => 'Cristiane Lopes Machado', 'email' => 'cristiane.machado@araucaria.pr.gov.br',
                    'cargo' => 'Orientadora Educacional', 'dep' => 'SMED-DEP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '81.00', 2025 => '83.00', 2026 => '82.50'], // Recurso 3
                ],
                [
                    'mat' => 'SERV-1028', 'cpf' => '39940051144', 'nome' => 'Rodrigo Zanetti Rosa', 'email' => 'rodrigo.rosa@araucaria.pr.gov.br',
                    'cargo' => 'Professor de Educação Física', 'dep' => 'SMED-DEP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '90.00', 2025 => '92.00', 2026 => '93.00'],
                ],

                // ── SMED-DGA (5 Servidores)
                [
                    'mat' => 'SERV-1029', 'cpf' => '40051162255', 'nome' => 'Débora Regina Albuquerque', 'email' => 'debora.albuquerque@araucaria.pr.gov.br',
                    'cargo' => 'Secretária Escolar', 'dep' => 'SMED-DGA', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '85.00', 2025 => '86.50', 2026 => '88.00'],
                ],
                [
                    'mat' => 'SERV-1030', 'cpf' => '51162273366', 'nome' => 'Gustavo Pereira Dutra', 'email' => 'gustavo.dutra@araucaria.pr.gov.br',
                    'cargo' => 'Assistente Administrativo Escolar', 'dep' => 'SMED-DGA', 'estagio' => true, 'estagio_fase' => 2, 'situacao' => 'ativo',
                    'notas' => [2024 => '79.00', 2025 => '81.00', 2026 => '82.50'],
                ],
                [
                    'mat' => 'SERV-1031', 'cpf' => '62273384477', 'nome' => 'Tatiane Souza Toledo', 'email' => 'tatiane.toledo@araucaria.pr.gov.br',
                    'cargo' => 'Nutricionista Escolar', 'dep' => 'SMED-DGA', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '93.00', 2025 => '94.00', 2026 => '95.50'],
                ],
                [
                    'mat' => 'SERV-1032', 'cpf' => '73384495588', 'nome' => 'Leandro Maciel Faria', 'email' => 'leandro.faria@araucaria.pr.gov.br',
                    'cargo' => 'Técnico em Manutenção Escolar', 'dep' => 'SMED-DGA', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '77.00', 2025 => '79.00', 2026 => '80.00'],
                ],
                [
                    'mat' => 'SERV-1033', 'cpf' => '84495506699', 'nome' => 'Bianca Morais Correa', 'email' => 'bianca.correa@araucaria.pr.gov.br',
                    'cargo' => 'Agente de Apoio Escolar', 'dep' => 'SMED-DGA', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '83.00', 2025 => '85.00', 2026 => '86.00'],
                ],

                // ── SMS-DAS (5 Servidores)
                [
                    'mat' => 'SERV-1034', 'cpf' => '95506617700', 'nome' => 'Dra. Larissa Monteiro', 'email' => 'larissa.monteiro@araucaria.pr.gov.br',
                    'cargo' => 'Médica da Família', 'dep' => 'SMS-DAS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '95.00', 2025 => '96.00', 2026 => '97.00'],
                ],
                [
                    'mat' => 'SERV-1006', 'cpf' => '60070080099', 'nome' => 'Patrícia Oliveira Lima', 'email' => 'patricia.oliveira@araucaria.pr.gov.br',
                    'cargo' => 'Enfermeira Padrão', 'dep' => 'SMS-DAS', 'estagio' => false, 'situacao' => 'afastado_saude',
                    'notas' => [2024 => '78.00', 2025 => '80.00', 2026 => '81.50'],
                ],
                [
                    'mat' => 'SERV-1035', 'cpf' => '16617728811', 'nome' => 'Vanessa Nogueira Paz', 'email' => 'vanessa.paz@araucaria.pr.gov.br',
                    'cargo' => 'Técnica de Enfermagem', 'dep' => 'SMS-DAS', 'estagio' => true, 'estagio_fase' => 1, 'situacao' => 'ativo',
                    'notas' => [2024 => '84.00', 2025 => '86.00', 2026 => '87.00'],
                ],
                [
                    'mat' => 'SERV-1036', 'cpf' => '27728839922', 'nome' => 'Dr. Wellington Santos Cruz', 'email' => 'wellington.cruz@araucaria.pr.gov.br',
                    'cargo' => 'Odontólogo Clínico', 'dep' => 'SMS-DAS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '91.00', 2025 => '92.50', 2026 => '93.00'],
                ],
                [
                    'mat' => 'SERV-1037', 'cpf' => '38839940033', 'nome' => 'Camila Rossi Bernardes', 'email' => 'camila.bernardes@araucaria.pr.gov.br',
                    'cargo' => 'Assistente Social da Saúde', 'dep' => 'SMS-DAS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '86.00', 2025 => '88.00', 2026 => '89.50'],
                ],

                // ── SMS-DVS (5 Servidores)
                [
                    'mat' => 'SERV-1038', 'cpf' => '49940051144', 'nome' => 'Renato Peixoto Silveira', 'email' => 'renato.silveira@araucaria.pr.gov.br',
                    'cargo' => 'Fiscal Sanitário', 'dep' => 'SMS-DVS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '83.00', 2025 => '84.00', 2026 => '85.00'], // Recurso 4
                ],
                [
                    'mat' => 'SERV-1039', 'cpf' => '50051162255', 'nome' => 'Lorena Guimarães Rios', 'email' => 'lorena.rios@araucaria.pr.gov.br',
                    'cargo' => 'Bióloga Epidemiologista', 'dep' => 'SMS-DVS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '92.00', 2025 => '93.50', 2026 => '94.00'],
                ],
                [
                    'mat' => 'SERV-1040', 'cpf' => '61162273366', 'nome' => 'Thiago Alencar Costa', 'email' => 'thiago.costa@araucaria.pr.gov.br',
                    'cargo' => 'Agente de Combate a Endemias', 'dep' => 'SMS-DVS', 'estagio' => true, 'estagio_fase' => 3, 'situacao' => 'ativo',
                    'notas' => [2024 => '76.00', 2025 => '78.50', 2026 => '80.00'],
                ],
                [
                    'mat' => 'SERV-1041', 'cpf' => '72273384477', 'nome' => 'Mônica Furtado Reis', 'email' => 'monica.reis@araucaria.pr.gov.br',
                    'cargo' => 'Médica Veterinária Sanitarista', 'dep' => 'SMS-DVS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '90.00', 2025 => '91.00', 2026 => '92.00'],
                ],
                [
                    'mat' => 'SERV-1042', 'cpf' => '83384495588', 'nome' => 'Diego Henrique Prado', 'email' => 'diego.prado@araucaria.pr.gov.br',
                    'cargo' => 'Técnico em Vigilância em Saúde', 'dep' => 'SMS-DVS', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '80.00', 2025 => '82.00', 2026 => '83.50'],
                ],

                // ── SMOSP-DOP (5 Servidores)
                [
                    'mat' => 'SERV-1009', 'cpf' => '90010020033', 'nome' => 'Lucas Fontana Camargo', 'email' => 'lucas.camargo@araucaria.pr.gov.br',
                    'cargo' => 'Engenheiro Civil', 'dep' => 'SMOSP-DOP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '91.00', 2025 => '93.00', 2026 => '94.50'],
                ],
                [
                    'mat' => 'SERV-1043', 'cpf' => '94495506699', 'nome' => 'Carolina Mattos Vieira', 'email' => 'carolina.vieira@araucaria.pr.gov.br',
                    'cargo' => 'Arquiteta e Urbanista', 'dep' => 'SMOSP-DOP', 'estagio' => true, 'estagio_fase' => 2, 'situacao' => 'ativo',
                    'notas' => [2024 => '87.00', 2025 => '89.00', 2026 => '90.00'],
                ],
                [
                    'mat' => 'SERV-1044', 'cpf' => '15506617700', 'nome' => 'Fernando Dias Silveira', 'email' => 'fernando.silveira@araucaria.pr.gov.br',
                    'cargo' => 'Técnico em Edificações', 'dep' => 'SMOSP-DOP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '77.00', 2025 => '79.00', 2026 => '78.50'], // Recurso 5
                ],
                [
                    'mat' => 'SERV-1045', 'cpf' => '26617728811', 'nome' => 'André Luiz Guimarães', 'email' => 'andre.guimaraes@araucaria.pr.gov.br',
                    'cargo' => 'Fiscal de Obras Públicas', 'dep' => 'SMOSP-DOP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '82.00', 2025 => '84.00', 2026 => '85.00'],
                ],
                [
                    'mat' => 'SERV-1046', 'cpf' => '37728839922', 'nome' => 'Paula Beatriz Carvalho', 'email' => 'paula.carvalho@araucaria.pr.gov.br',
                    'cargo' => 'Engenheira Eletricista', 'dep' => 'SMOSP-DOP', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '93.00', 2025 => '95.00', 2026 => '96.00'],
                ],

                // ── SMOSP-DSU (5 Servidores)
                [
                    'mat' => 'SERV-1047', 'cpf' => '48839940033', 'nome' => 'Rogério Macedo Teles', 'email' => 'rogerio.teles@araucaria.pr.gov.br',
                    'cargo' => 'Supervisor de Malha Viária', 'dep' => 'SMOSP-DSU', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '81.00', 2025 => '83.00', 2026 => '84.00'],
                ],
                [
                    'mat' => 'SERV-1048', 'cpf' => '59940051144', 'nome' => 'Joelma Antunes Ferreira', 'email' => 'joelma.ferreira@araucaria.pr.gov.br',
                    'cargo' => 'Técnica em Pavimentação', 'dep' => 'SMOSP-DSU', 'estagio' => true, 'estagio_fase' => 1, 'situacao' => 'ativo',
                    'notas' => [2024 => '74.00', 2025 => '76.50', 2026 => '78.00'],
                ],
                [
                    'mat' => 'SERV-1049', 'cpf' => '60051162255', 'nome' => 'Marcelo Barreto Lins', 'email' => 'marcelo.lins@araucaria.pr.gov.br',
                    'cargo' => 'Fiscal de Iluminação Pública', 'dep' => 'SMOSP-DSU', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '85.00', 2025 => '87.00', 2026 => '88.00'],
                ],
                [
                    'mat' => 'SERV-1050', 'cpf' => '71162273366', 'nome' => 'Valéria Cristina Cunha', 'email' => 'valeria.cunha@araucaria.pr.gov.br',
                    'cargo' => 'Analista de Manutenção Urbana', 'dep' => 'SMOSP-DSU', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '88.00', 2025 => '90.00', 2026 => '91.50'],
                ],
                [
                    'mat' => 'SERV-1010', 'cpf' => '00020030044', 'nome' => 'Josué Fagundes Neves', 'email' => 'josue.neves@araucaria.pr.gov.br',
                    'cargo' => 'Encarregado Operacional de Serviços', 'dep' => 'SMOSP-DSU', 'estagio' => false, 'situacao' => 'ativo',
                    'notas' => [2024 => '72.00', 2025 => '73.50', 2026 => '75.00'],
                ],
            ];

            $departamentosParentMap = collect($departamentosData)->pluck('parent', 'code')->toArray();
            $servidoresMap = [];
            foreach ($servidoresOperacionaisDefs as $sDef) {
                $userS = User::firstOrCreate(
                    ['email' => $sDef['email']],
                    ['name' => $sDef['nome'], 'password' => $senhaPadrao]
                );
                $userS->tenants()->syncWithoutDetaching([$tenantId => ['status' => 'active', 'is_primary' => true]]);

                $depObj = $departamentosMap[$sDef['dep']];
                $dirObj = $diretoresServidores[$sDef['dep']];
                $secCode = $departamentosParentMap[$sDef['dep']] ?? 'SMAD';
                $secObj = $secretariasMap[$secCode];

                $serv = Servidor::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'matricula' => $sDef['mat']],
                    [
                        'user_id'               => $userS->id,
                        'cpf'                   => $sDef['cpf'],
                        'nome_completo'         => $sDef['nome'],
                        'email'                 => $sDef['email'],
                        'data_nascimento'       => '1985-06-15',
                        'data_admissao'         => $sDef['estagio'] ? '2023-03-01' : '2016-02-15',
                        'regime_juridico'       => 'estatutario',
                        'regime_previdenciario' => 'rpps',
                        'cargo_efetivo'         => $sDef['cargo'],
                        'orgao_lotacao'         => $secObj->name,
                        'lotacao_fisica'        => $depObj->name,
                        'org_unit_id'           => $depObj->id,
                        'chefia_imediata_id'    => $dirObj->id,
                        'plano_carreira_id'     => str_contains($sDef['dep'], 'SMED') ? $planoMagisterio->id : $planoGeral->id,
                        'situacao_funcional'    => $sDef['situacao'],
                        'estagio_probatorio'    => $sDef['estagio'],
                        'estagio_fase_atual'    => $sDef['estagio_fase'] ?? null,
                        'carga_horaria_semanal' => 40,
                    ]
                );

                OrgUnitUser::withoutGlobalScope('tenant')->updateOrCreate(
                    [
                        'tenant_id'   => $tenantId,
                        'org_unit_id' => $depObj->id,
                        'user_id'     => $userS->id,
                    ],
                    [
                        'role'       => 'membro',
                        'is_primary' => true,
                        'valid_from' => $sDef['estagio'] ? '2023-03-01' : '2016-02-15',
                    ]
                );

                $servidoresMap[$sDef['mat']] = ['servidor' => $serv, 'def' => $sDef, 'diretor' => $dirObj];
            }

            // ── 8. Ciclos de Avaliação (Cadência Trienal 2024 -> 2025 -> 2026) ─
            $ciclo2024 = CicloAvaliacao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'ano_competencia' => 2024],
                [
                    'ano_referencia'            => 2024,
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
                    'ano_referencia'            => 2025,
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
                    'ano_referencia'            => 2026,
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

            // ── 9. Avaliações com Notas Reais para TODOS os 50 Servidores ───────
            $avaliacoesInstancias = [];
            foreach ($servidoresMap as $item) {
                $servidor = $item['servidor'];
                $sDef     = $item['def'];
                $diretor  = $item['diretor'];

                foreach ($sDef['notas'] as $ano => $notaStr) {
                    $cicloTarget = $ciclosPorAno[$ano];
                    $notaNum = (float) $notaStr;

                    // Mapeia nota de 0 a 100 para Grau 1 a 5 da escala Chiavenato
                    $grau = $notaNum >= 95 ? 5 : ($notaNum >= 85 ? 4 : ($notaNum >= 75 ? 3 : ($notaNum >= 60 ? 2 : 1)));
                    // Nf = (grau - 1) x 2,5 — mesma fórmula de CalculadoraNotaService, produz NFD 0-10
                    $nfdReal = number_format(($grau - 1) * 2.5, 2, '.', '');

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

                    $avExistente = Avaliacao::withoutGlobalScope('tenant')
                        ->where('tenant_id', $tenantId)
                        ->where('ciclo_id', $cicloTarget->id)
                        ->where('servidor_id', $servidor->user_id)
                        ->first();

                    $dadosAvaliacao = [
                        'avaliador_id'        => $diretor->user_id,
                        'periodo_inicio'      => "{$ano}-01-01",
                        'periodo_fim'         => "{$ano}-12-31",
                        'dias_exercicio'      => 365,
                        'tipo_avaliacao'      => Avaliacao::TIPO_INTEGRAL,
                        'status_avaliacao'    => Avaliacao::STATUS_ATIVA,
                        'modelo_formulario_id'=> $modeloGeral->id,
                        'respostas_fatores'   => $respostas,
                        'nota_final'          => $nfdReal,
                        'elegivel_progressao' => (float) $nfdReal >= 7.00,
                        'data_conclusao'      => $ano < 2026 ? Carbon::create($ano, 10, 15, 14, 30) : null,
                        'ciencia_servidor_em' => $ano < 2026 ? Carbon::create($ano, 10, 20, 10, 0) : null,
                        'homologada'          => $ano < 2026,
                        'homologada_em'       => $ano < 2026 ? Carbon::create($ano, 12, 10, 16, 0) : null,
                        'homologada_por'      => $ano < 2026 ? $secretariosServidores['SMAD']->user_id : null,
                    ];

                    if ($avExistente) {
                        if (! $avExistente->homologada) {
                            $avExistente->update($dadosAvaliacao);
                        }
                        $av = $avExistente;
                    } else {
                        $av = Avaliacao::withoutGlobalScope('tenant')->create([
                            'tenant_id'   => $tenantId,
                            'ciclo_id'    => $cicloTarget->id,
                            'servidor_id' => $servidor->user_id,
                            ...$dadosAvaliacao,
                        ]);
                    }

                    if ($ano === 2026) {
                        $avaliacoesInstancias[$sDef['mat']] = $av;
                    }
                }
            }

            // ── 10. Diário de Bordo (Técnica do Incidente Crítico - CIT) ───────
            $apontamentosCitDefs = [
                // Positivos (Grau 5)
                [
                    'mat' => 'SERV-1001', 'fator' => 'F3', 'tipo' => 'positivo', 'data' => '2026-03-12',
                    'desc' => 'Servidor desenvolveu rotina automatizada de conciliação bancária que reduziu em 40% o tempo de fechamento mensal.',
                ],
                [
                    'mat' => 'SERV-1003', 'fator' => 'F6', 'tipo' => 'positivo', 'data' => '2026-04-18',
                    'desc' => 'Conduziu com elevado rigor técnico ação de fiscalização que resultou na recuperação de R$ 450.000 em créditos tributários inscritos.',
                ],
                [
                    'mat' => 'SERV-1013', 'fator' => 'F5', 'tipo' => 'positivo', 'data' => '2026-05-20',
                    'desc' => 'Coordenou oficina de clima organizacional e mediação de conflitos entre unidades, restaurando a integração da equipe.',
                ],
                [
                    'mat' => 'SERV-1034', 'fator' => 'F4', 'tipo' => 'positivo', 'data' => '2026-06-05',
                    'desc' => 'Atingiu 100% da meta de vacinação no território da UBS, realizando busca ativa com atendimento humanizado domiciliar.',
                ],
                [
                    'mat' => 'SERV-1046', 'fator' => 'F6', 'tipo' => 'positivo', 'data' => '2026-07-14',
                    'desc' => 'Elaborou projeto de eficientização energética predial que gerou economia estimada de 25% na fatura de energia elétrica.',
                ],

                // Negativos (Grau 1 e 2)
                [
                    'mat' => 'SERV-1002', 'fator' => 'F6', 'tipo' => 'negativo', 'data' => '2026-02-25',
                    'desc' => 'Apresentou dificuldades na instrução de processos com atrasos reiterados e inconsistências técnicas nos termos de referência.',
                ],
                [
                    'mat' => 'SERV-1007', 'fator' => 'F1', 'tipo' => 'negativo', 'data' => '2026-05-10',
                    'desc' => 'Registradas faltas injustificadas e atrasos frequentes no primeiro quadrimestre de 2026, descumprindo a jornada regulamentar.',
                ],
                [
                    'mat' => 'SERV-1021', 'fator' => 'F4', 'tipo' => 'negativo', 'data' => '2026-06-22',
                    'desc' => 'Descumpriu o prazo estipulado para consolidação da proposta orçamentária setorial, gerando retrabalho para a equipe.',
                ],
                [
                    'mat' => 'SERV-1044', 'fator' => 'F4', 'tipo' => 'negativo', 'data' => '2026-04-30',
                    'desc' => 'Deixou de realizar medição tempestiva na obra da escola municipal, ocasionando atraso no cronograma físico-financeiro.',
                ],
            ];

            foreach ($apontamentosCitDefs as $citDef) {
                if (isset($servidoresMap[$citDef['mat']])) {
                    $sItem = $servidoresMap[$citDef['mat']];
                    DiarioBordo::withoutGlobalScope('tenant')->updateOrCreate(
                        [
                            'tenant_id'       => $tenantId,
                            'servidor_id'     => $sItem['servidor']->user_id,
                            'fator_id'        => $fatoresMap[$citDef['fator']]->id,
                            'data_ocorrencia' => $citDef['data'],
                        ],
                        [
                            'ciclo_id'            => $ciclo2026->id,
                            'avaliador_id'        => $sItem['diretor']->user_id,
                            'tipo'                => $citDef['tipo'],
                            'descricao_fato'      => $citDef['desc'],
                            'ciencia_servidor_em' => Carbon::now()->subMonths(1),
                        ]
                    );
                }
            }

            // ── 11. Comissão CAPD & Membros ────────────────────────────────────
            $comissao = Comissao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'numero_portaria' => 'Portaria nº 142/2026'],
                [
                    'ciclo_id'                 => $ciclo2026->id,
                    'data_publicacao_portaria' => '2026-01-10',
                    'ativa'                    => true,
                ]
            );

            $membroPresidente = ComissaoMembro::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'servidor_id' => $diretoresServidores['SMAD-DRH']->user_id],
                [
                    'papel'               => ComissaoMembro::PAPEL_PRESIDENTE,
                    'ativo'               => true,
                    'data_inicio_mandato' => '2026-01-10',
                    'data_fim_mandato'    => '2027-01-09',
                ]
            );

            $membroRelator1 = ComissaoMembro::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'servidor_id' => $diretoresServidores['SMF-CONT']->user_id],
                [
                    'papel'               => ComissaoMembro::PAPEL_TITULAR_GESTAO,
                    'ativo'               => true,
                    'data_inicio_mandato' => '2026-01-10',
                    'data_fim_mandato'    => '2027-01-09',
                ]
            );

            $membroRelator2 = ComissaoMembro::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'servidor_id' => $diretoresServidores['SMED-DEP']->user_id],
                [
                    'papel'               => ComissaoMembro::PAPEL_TITULAR_GESTAO,
                    'ativo'               => true,
                    'data_inicio_mandato' => '2026-01-10',
                    'data_fim_mandato'    => '2027-01-09',
                ]
            );

            // ── 12. Recursos Administrativos com Casos Práticos ────────────────
            $recursosDefs = [
                // Recurso 1: Thiago Henrique (SMF-CONT) - Em Instrução
                [
                    'mat' => 'SERV-1008',
                    'fator' => 'F1',
                    'status' => Recurso::STATUS_EM_INSTRUCAO,
                    'justificativa' => 'Contesto a pontuação atribuída no Fator F1 (Assiduidade), pois apresentei atestado médico tempestivo referente aos dias 14 e 15 de março devidamente homologado na perícia médica.',
                    'contestacao_chefia' => 'Chefia imediata confirma o protocolo e remete os autos à comissão para validação do documento.',
                    'relator' => $membroRelator1->id,
                ],
                // Recurso 2: Fábio Nascimento Leite (SMF-TRIB) - Pautado para julgamento
                [
                    'mat' => 'SERV-1025',
                    'fator' => 'F3',
                    'status' => Recurso::STATUS_PAUTADO,
                    'justificativa' => 'Requeiro elevação no fator Iniciativa (F3), haja vista proposição de projeto de melhoria da rotina de intimações fiscais via Domicílio Tributário Eletrônico.',
                    'contestacao_chefia' => 'Chefia atesta que a iniciativa trouxe ganho de tempo, recomendando acatamento parcial das razões do servidor.',
                    'relator' => $membroRelator1->id,
                ],
                // Recurso 3: Cristiane Lopes Machado (SMED-DEP) - Julgado e Provido (Deferido)
                [
                    'mat' => 'SERV-1027',
                    'fator' => 'F5',
                    'status' => Recurso::STATUS_JULGADO_PROVIDO,
                    'justificativa' => 'Não concordo com a nota regular atribuída em Trabalho em Equipe. Conduzi oficinas pedagógicas intersetoriais com aprovação unânime dos docentes.',
                    'contestacao_chefia' => 'Reconhece-se a participação nas oficinas, retificando o parecer para deferimento da elevação do conceito.',
                    'relator' => $membroRelator2->id,
                ],
                // Recurso 4: Renato Peixoto Silveira (SMS-DVS) - Julgado e Desprovido (Indeferido)
                [
                    'mat' => 'SERV-1038',
                    'fator' => 'F6',
                    'status' => Recurso::STATUS_JULGADO_DESPROVIDO,
                    'justificativa' => 'Pede revisão da nota de Qualidade Técnica alegando que o volume de autos lavrados compensa eventuais erros formais.',
                    'contestacao_chefia' => 'Autos com vícios materiais ensejaram nulidade de 4 autuações fiscais, mantendo-se a nota técnica fundamentada no Diário de Bordo.',
                    'relator' => $membroRelator1->id,
                ],
                // Recurso 5: Fernando Dias Silveira (SMOSP-DOP) - Recém-Interposto
                [
                    'mat' => 'SERV-1044',
                    'fator' => 'F4',
                    'status' => Recurso::STATUS_INTERPOSTO,
                    'justificativa' => 'Solicita reconsideração da nota de produtividade em razão de paralisação da obra por fatores climáticos adversos imprevisíveis.',
                    'contestacao_chefia' => null,
                    'relator' => null,
                ],
            ];

            foreach ($recursosDefs as $rDef) {
                if (isset($avaliacoesInstancias[$rDef['mat']])) {
                    $av = $avaliacoesInstancias[$rDef['mat']];
                    Recurso::withoutGlobalScope('tenant')->updateOrCreate(
                        [
                            'tenant_id'           => $tenantId,
                            'avaliacao_id'        => $av->id,
                            'fator_contestado_id' => $fatoresMap[$rDef['fator']]->id,
                        ],
                        [
                            'recorrente_id'          => $av->servidor_id,
                            'justificativa_servidor' => $rDef['justificativa'],
                            'status'                 => $rDef['status'],
                            'relator_id'             => $rDef['relator'],
                            'prazo_relator_ate'      => Carbon::now()->addDays(10),
                            'contestacao_chefia'     => $rDef['contestacao_chefia'],
                            'contestacao_em'         => $rDef['contestacao_chefia'] ? Carbon::now()->subDays(2) : null,
                        ]
                    );
                }
            }

            // ── 13. Sessões Deliberativas da Comissão CAD ───────────────────────
            $sessao1 = Sessao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'tipo_sessao' => 'ordinaria', 'data_sessao' => '2026-08-15 14:00:00'],
                [
                    'quorum_presente' => 4,
                    'quorum_minimo'   => 3,
                    'ata_texto'       => 'Ata da 1ª Sessão Ordinária da Comissão CAD do Ciclo 2026. Deliberação sobre os Recursos nº 003 (Provido) e nº 004 (Desprovido). Homologação das notas retificadas.',
                    'hash_ata_sha256' => hash('sha256', "ATA_SESSAO_01_CAD_{$tenantId}_2026"),
                    'finalizada'      => true,
                    'finalizada_em'   => '2026-08-15 16:30:00',
                ]
            );

            $sessao2 = Sessao::withoutGlobalScope('tenant')->updateOrCreate(
                ['tenant_id' => $tenantId, 'comissao_id' => $comissao->id, 'tipo_sessao' => 'extraordinaria', 'data_sessao' => Carbon::now()->addDays(5)->format('Y-m-d 14:00:00')],
                [
                    'quorum_presente' => 0,
                    'quorum_minimo'   => 3,
                    'ata_texto'       => 'Pauta de Julgamento da 2ª Sessão Extraordinária. Julgamento do Recurso nº 002 (Pautado) e instrução do Recurso nº 001.',
                    'hash_ata_sha256' => null,
                    'finalizada'      => false,
                    'finalizada_em'   => null,
                ]
            );

            // ── 14. Planos de Melhoria de Desempenho (PMD) ──────────────────────
            if (isset($servidoresMap['SERV-1002'])) {
                $marianaServ = $servidoresMap['SERV-1002']['servidor'];
                PlanoMelhoria::withoutGlobalScope('tenant')->updateOrCreate(
                    ['tenant_id' => $tenantId, 'servidor_id' => $marianaServ->id, 'ciclo_id' => $ciclo2025->id],
                    [
                        'ciclo_verificacao_id'    => $ciclo2026->id,
                        'nfc_gatilho'             => '62.00',
                        'objetivos'               => 'Capacitação específica em instrução de processos administrativos, gestão de contratos e redação oficial.',
                        'acoes'                   => '1. Concluir curso da Escola de Governo sobre Licitações (30h);\n2. Tutoria quinzenal com a Diretoria do DRH.',
                        'prazo'                   => '2026-10-31',
                        'status'                  => PlanoMelhoria::STATUS_EM_ANDAMENTO,
                        'observacoes_verificacao' => 'Acompanhamento do 2º trimestre: servidora matriculada no curso com 70% de frequência.',
                    ]
                );
            }
        });

        echo "==> Módulo CAPD populado com sucesso: 5 Secretarias, 10 Departamentos, 15 Chefias, 50 Servidores Operacionais, 150 Avaliações nos 3 Ciclos e 5 Recursos!\n";
    }
}

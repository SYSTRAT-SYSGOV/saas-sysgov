<?php

declare(strict_types=1);

namespace Modules\Escola\Database\Seeders;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Models\Module;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\AlunoContato;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Models\Turno;
use Modules\Escola\Support\EscolaContext;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;

/**
 * Seeder de dados de demonstração e teste para o módulo Escola.
 *
 * Popula:
 * 1. RBAC e habilitação do módulo escola nos tenants ativos.
 * 2. Unidades do organograma para as escolas.
 * 3. Escolas de exemplo (Monteiro Lobato e Cecília Meireles).
 * 4. Atribuição de permissões e acesso aos usuários do tenant.
 * 5. Estrutura escolar completa: turnos, matérias, trimestres, turmas, alunos e equipe gestora.
 */
final class EscolaExemploSeeder extends Seeder
{
    public function run(): void
    {
        // 1. RBAC base
        (new EscolaRbacSeeder())->run();

        // 2. Garantir registro do módulo Escola no catálogo
        $modulo = Module::firstOrCreate(
            ['alias' => 'escola'],
            [
                'name' => 'Cadastro Escolar',
                'description' => 'Gestão de escolas, turmas, matérias, professores e alunos da rede municipal',
                'enabled' => true,
                'monthly_fee_cents' => 0,
            ]
        );

        $tenants = Tenant::where('status', 'active')
            ->where('slug', '!=', 'systrat')
            ->get();

        if ($tenants->isEmpty()) {
            $tenants = Tenant::where('id', '>', 1)->get();
        }

        $provisioner = app(ModuleRoleProvisioner::class);

        foreach ($tenants as $tenant) {
            $this->semearTenant($tenant, $modulo, $provisioner);
        }
    }

    private function semearTenant(Tenant $tenant, Module $modulo, ModuleRoleProvisioner $provisioner): void
    {
        // Habilita módulo no tenant
        $tenant->modules()->syncWithoutDetaching([
            $modulo->id => [
                'enabled' => true,
                'monthly_fee_cents' => 0,
                'settings' => json_encode([]),
            ],
        ]);

        // Provisiona perfis do módulo para o tenant
        $provisioner->provisionForTenant($tenant, 'escola');

        // Contexto de tenant
        $tenantContext = app(TenantContext::class);
        $tenantContext->set($tenant);

        try {
            // Localiza ou cria a Secretaria de Educação no organograma
            $secEducacao = OrgUnit::where('tenant_id', $tenant->id)
                ->where(function ($q) {
                    $q->where('code', 'SMED')->orWhere('name', 'like', '%Educação%');
                })
                ->first();

            if (!$secEducacao) {
                $raiz = OrgUnit::where('tenant_id', $tenant->id)->whereNull('parent_id')->first()
                    ?? OrgUnit::create([
                        'tenant_id' => $tenant->id,
                        'name' => 'Prefeitura Municipal',
                        'code' => 'PREF',
                        'type' => 'raiz',
                        'level' => 1,
                        'path' => '1',
                    ]);

                $secEducacao = OrgUnit::create([
                    'tenant_id' => $tenant->id,
                    'parent_id' => $raiz->id,
                    'name' => 'Secretaria Municipal de Educação',
                    'code' => 'SMED',
                    'type' => 'secretaria',
                    'level' => 2,
                    'path' => "{$raiz->path}." . (OrgUnit::where('tenant_id', $tenant->id)->max('id') + 1),
                ]);
            }

            // Unidades escolares no organograma
            $orgEscola1 = OrgUnit::firstOrCreate(
                ['tenant_id' => $tenant->id, 'code' => 'EM-LOBATO'],
                [
                    'parent_id' => $secEducacao->id,
                    'name' => 'Escola Municipal Monteiro Lobato',
                    'type' => 'escola',
                    'level' => 3,
                    'path' => "{$secEducacao->path}.1",
                ]
            );

            $orgEscola2 = OrgUnit::firstOrCreate(
                ['tenant_id' => $tenant->id, 'code' => 'EM-CECILIA'],
                [
                    'parent_id' => $secEducacao->id,
                    'name' => 'Escola Municipal Cecília Meireles',
                    'type' => 'escola',
                    'level' => 3,
                    'path' => "{$secEducacao->path}.2",
                ]
            );

            // Escolas
            $escola1 = Escola::firstOrCreate(
                ['tenant_id' => $tenant->id, 'inep' => '41001234'],
                [
                    'nome' => 'Escola Municipal Monteiro Lobato',
                    'org_unit_id' => $orgEscola1->id,
                    'ativa' => true,
                ]
            );

            $escola2 = Escola::firstOrCreate(
                ['tenant_id' => $tenant->id, 'inep' => '41005678'],
                [
                    'nome' => 'Escola Municipal Cecília Meireles',
                    'org_unit_id' => $orgEscola2->id,
                    'ativa' => true,
                ]
            );

            // Atribui acesso aos usuários do tenant
            $this->concederAcessoUsuarios($tenant);

            // Popula dados pedagógicos e turmas na Escola 1
            $this->semearDadosEscola($tenant, $escola1, '1');

            // Popula dados básicos na Escola 2
            $this->semearDadosEscola($tenant, $escola2, '2');

        } finally {
            $tenantContext->clear();
        }
    }

    private function concederAcessoUsuarios(Tenant $tenant): void
    {
        $roleDirecao = Role::where('tenant_id', $tenant->id)
            ->where('slug', 'escola_direcao')
            ->first();

        $users = $tenant->users()->get();

        foreach ($users as $user) {
            if ($roleDirecao) {
                $user->roles()->syncWithoutDetaching([
                    $roleDirecao->id => ['tenant_id' => $tenant->id],
                ]);
            }

            // Permite acesso irrestrito a todas as escolas do módulo
            UserModuleAccess::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'tenant_id' => $tenant->id,
                    'module_alias' => 'escola',
                ],
                [
                    'role' => 'admin',
                    'can_manage_users' => true,
                    'org_unit_ids' => null,
                    'status' => 'active',
                ]
            );

            $user->clearPermissionCache();
        }
    }

    private function semearDadosEscola(Tenant $tenant, Escola $escola, string $prefixo): void
    {
        $escolaContext = app(EscolaContext::class);
        $escolaContext->set($escola);

        try {
            // Turnos
            $turnoManha = Turno::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => 'Manhã'],
                ['ordem' => 1]
            );

            $turnoTarde = Turno::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => 'Tarde'],
                ['ordem' => 2]
            );

            $turnoIntegral = Turno::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => 'Integral'],
                ['ordem' => 3]
            );

            // Trimestres 2026
            Trimestre::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'ano_letivo' => 2026, 'numero' => 1],
                ['data_inicio' => '2026-02-02', 'data_fim' => '2026-05-08']
            );
            Trimestre::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'ano_letivo' => 2026, 'numero' => 2],
                ['data_inicio' => '2026-05-11', 'data_fim' => '2026-08-28']
            );
            Trimestre::firstOrCreate(
                ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'ano_letivo' => 2026, 'numero' => 3],
                ['data_inicio' => '2026-08-31', 'data_fim' => '2026-12-18']
            );

            // Categorias de Ocorrência
            $cats = [
                ['nome' => 'Elogio & Mérito', 'cor' => '#10b981'],
                ['nome' => 'Falta Justificada', 'cor' => '#06b6d4'],
                ['nome' => 'Atraso na Entrada', 'cor' => '#f59e0b'],
                ['nome' => 'Ocorrência Disciplinar', 'cor' => '#e11d48'],
            ];
            foreach ($cats as $cat) {
                CategoriaOcorrencia::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => $cat['nome']],
                    ['cor' => $cat['cor']]
                );
            }

            // Equipe Gestora
            $equipe = [
                ['nome' => "Carlos Eduardo Silva ({$prefixo})", 'cargo' => 'diretor', 'ordem' => 1],
                ['nome' => "Helena Mara Santos ({$prefixo})", 'cargo' => 'diretor_auxiliar', 'ordem' => 2],
                ['nome' => "Ana Cláudia Martins ({$prefixo})", 'cargo' => 'pedagoga', 'ordem' => 3],
                ['nome' => "Juliana Rocha ({$prefixo})", 'cargo' => 'secretaria', 'ordem' => 4],
            ];
            $pedagoga = null;
            foreach ($equipe as $membro) {
                $m = MembroEquipe::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => $membro['nome']],
                    ['cargo' => $membro['cargo'], 'ordem' => $membro['ordem']]
                );
                if ($membro['cargo'] === 'pedagoga') {
                    $pedagoga = $m;
                }
            }

            // Matérias
            $materiasNomes = [
                'Língua Portuguesa',
                'Matemática',
                'Ciências da Natureza',
                'História',
                'Geografia',
                'Arte',
                'Educação Física',
                'Língua Inglesa',
            ];
            $materias = [];
            foreach ($materiasNomes as $nomeMateria) {
                $materias[] = Materia::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'escola_id' => $escola->id, 'nome' => $nomeMateria]
                );
            }

            // Turmas
            $definicoesTurmas = [
                ['nome' => "1º Ano A ({$prefixo})", 'turno' => $turnoManha, 'ano' => 2026],
                ['nome' => "2º Ano A ({$prefixo})", 'turno' => $turnoManha, 'ano' => 2026],
                ['nome' => "5º Ano A ({$prefixo})", 'turno' => $turnoManha, 'ano' => 2026],
                ['nome' => "6º Ano A ({$prefixo})", 'turno' => $turnoTarde, 'ano' => 2026],
                ['nome' => "9º Ano A ({$prefixo})", 'turno' => $turnoTarde, 'ano' => 2026],
            ];

            $nomesAlunos = [
                ['Bernardo Alves', 'Mariana Alves', 'Ricardo Alves'],
                ['Beatriz Castro', 'Camila Castro', 'Gabriel Castro'],
                ['Davi Lucas Ferreira', 'Fernanda Ferreira', 'Lucas Ferreira'],
                ['Enzo Gabriel Lima', 'Juliana Lima', 'Matheus Lima'],
                ['Helena Ribeiro', 'Larissa Ribeiro', 'Thiago Ribeiro'],
                ['Isadora Martins', 'Patrícia Martins', 'Rodrigo Martins'],
            ];

            foreach ($definicoesTurmas as $indexTurma => $def) {
                $turma = Turma::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'escola_id' => $escola->id,
                        'nome' => $def['nome'],
                        'ano_letivo' => $def['ano'],
                    ],
                    [
                        'turno_id' => $def['turno']->id,
                        'pedagoga_id' => $pedagoga?->id,
                    ]
                );

                // Vincula matérias à turma
                foreach ($materias as $mat) {
                    TurmaMateria::firstOrCreate([
                        'tenant_id' => $tenant->id,
                        'escola_id' => $escola->id,
                        'turma_id' => $turma->id,
                        'materia_id' => $mat->id,
                    ]);
                }

                // Alunos da turma
                foreach ($nomesAlunos as $numero => $familia) {
                    $numeroChamada = $numero + 1;
                    $nomeAluno = "{$familia[0]} {$prefixo}";
                    $mae = $familia[1];
                    $pai = $familia[2];
                    $nascimentoFormatado = sprintf('201%d-0%d-15', max(0, 8 - $indexTurma), $numeroChamada);

                    $pessoa = Pessoa::firstOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'tipo' => 'fisica',
                            'nome' => $nomeAluno,
                        ],
                        [
                            'nome_mae' => $mae,
                            'nome_pai' => $pai,
                            'data_nascimento' => $nascimentoFormatado,
                            'documento_pendente' => true,
                        ]
                    );

                    $aluno = Aluno::firstOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'escola_id' => $escola->id,
                            'nome' => $nomeAluno,
                        ],
                        [
                            'pessoa_id' => $pessoa->id,
                            'turma_id' => $turma->id,
                            'numero' => $numeroChamada,
                            'situacao' => 'ativo',
                            'mae' => $mae,
                            'pai' => $pai,
                            'cgm' => sprintf('2026%02d%02d%02d', (int) $prefixo, $turma->id, $numeroChamada),
                        ]
                    );

                    AlunoContato::firstOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'escola_id' => $escola->id,
                            'aluno_id' => $aluno->id,
                            'telefone' => sprintf('(41) 9987%d-%04d', $numeroChamada, $indexTurma * 100 + $numeroChamada),
                        ],
                        [
                            'descricao' => 'Mãe (WhatsApp)',
                            'ordem' => 1,
                        ]
                    );
                }
            }

        } finally {
            $escolaContext->clear();
        }
    }
}

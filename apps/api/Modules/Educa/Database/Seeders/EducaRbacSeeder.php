<?php

declare(strict_types=1);

namespace Modules\Educa\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\ModuleRoleProvisioner;
use Illuminate\Database\Seeder;
use Modules\Admin\Models\Module;

/**
 * Seeder de RBAC e catálogo para o módulo SYS-Educa (e seus submódulos).
 *
 * Registra os submódulos no catálogo da plataforma (Modules\Admin\Models\Module),
 * as permissões de acesso canônicas (educa.{submodulo}.{recurso}.{acao}) e
 * provisiona papéis-template para os tenants cadastrados.
 */
final class EducaRbacSeeder extends Seeder
{
    /**
     * Submódulos desacoplados que integram o catálogo de licenças da plataforma.
     *
     * @var array<string, array{name: string, description: string}>
     */
    public const SUBMODULOS = [
        'educa' => [
            'name' => 'Educação (SYS-Educa: Núcleo e Calendário)',
            'description' => 'Núcleo acadêmico obrigatório: Anos Letivos, Calendário Escolar, Escolas, Turmas e Matriz Curricular BNCC.',
        ],
        'educa-secretaria' => [
            'name' => 'SYS-Educa: Secretaria Escolar',
            'description' => 'Secretaria escolar: Matrículas, Histórico Escolar Oficial e Transferências com protocolo integrado.',
        ],
        'educa-pedagogico' => [
            'name' => 'SYS-Educa: Diário e Avaliação',
            'description' => 'Operação docente: Diário de Classe, Frequência por dia letivo e Motor de Avaliação declarativo sem eval.',
        ],
        'educa-servidores' => [
            'name' => 'SYS-Educa: Servidores e Jornada',
            'description' => 'Lotação docente e cumprimento da jornada de 1/3 de hora-atividade (Lei Federal 11.738/2008 - Lei do Piso).',
        ],
        'educa-educacenso' => [
            'name' => 'SYS-Educa: Censo Escolar INEP/MEC',
            'description' => 'Auditoria e consistência cadastral e exportador oficial de layouts do Censo Escolar/INEP.',
        ],
        'educa-transporte' => [
            'name' => 'SYS-Educa: Transporte Escolar',
            'description' => 'Gestão de rotas de transporte escolar rural e urbano, veículos, motoristas credenciados e estudantes vinculados.',
        ],
        'educa-comunicacao' => [
            'name' => 'SYS-Educa: Comunicação e Notificações',
            'description' => 'Notificações a pais e responsáveis sobre faltas, ocorrências e comunicados oficiais via mensageria/Outbox.',
        ],
    ];

    /**
     * Permissões canônicas do módulo Educa (focadas inicialmente no submódulo core).
     *
     * @var array<string, string>
     */
    public const PERMISSOES = [
        'educa.view' => 'Acessar o módulo SYS-Educa',
        'educa.core.anos_letivos.view' => 'Consultar anos letivos, etapas e conformidade LDB',
        'educa.core.anos_letivos.create' => 'Criar ano letivo',
        'educa.core.anos_letivos.update' => 'Editar ano letivo, etapas e iniciar fase de avaliação',
        'educa.core.anos_letivos.delete' => 'Remover ano letivo em planejamento',
        'educa.core.anos_letivos.open' => 'Iniciar o ano letivo',
        'educa.core.anos_letivos.freeze' => 'Congelar e retomar o ano letivo',
        'educa.core.anos_letivos.close' => 'Encerrar o ano letivo (torna imutável)',
        'educa.core.anos_letivos.batch' => 'Operar anos letivos em lote',
        'educa.core.calendarios.view' => 'Consultar calendários e dias',
        'educa.core.calendarios.manage' => 'Criar, editar e importar calendários e marcar dias',
        'educa.core.calendarios.publish' => 'Publicar calendário escolar com validação da LDB',
        'educa.core.calendarios.delete' => 'Remover calendário em rascunho',
        'educa.core.motivos_dia.view' => 'Consultar motivos de dia',
        'educa.core.motivos_dia.manage' => 'Gerenciar motivos de dia',
        'educa.secretaria.matriculas.view' => 'Consultar matrículas e enturmações',
        'educa.secretaria.matriculas.manage' => 'Efetuar, enturmar, remanejar e cancelar matrículas',
        'educa.secretaria.alunos.view' => 'Consultar ficha e perfil complementar do estudante',
        'educa.secretaria.alunos.manage' => 'Atualizar ficha cadastral e responsáveis do estudante',
        'educa.servidores.view' => 'Consultar servidores escolares, alocações e ocorrências',
        'educa.servidores.manage' => 'Cadastrar e gerenciar servidores, lotações e afastamentos',
        'educa.educacenso.view' => 'Consultar dados, histórico e diagnósticos do Censo Escolar',
        'educa.educacenso.manage' => 'Gerenciar auditorias, exportações e retorno do Censo Escolar',
        'educa.educacenso.auditoria.execute' => 'Executar auditoria de consistência cadastral do Censo Escolar',
        'educa.educacenso.exportacao.execute' => 'Solicitar geração assíncrona do arquivo oficial do Censo',
        'educa.educacenso.exportacao.download' => 'Realizar download do arquivo posicional do Censo',
        'educa.educacenso.retorno.execute' => 'Processar arquivo oficial de retorno e conciliar códigos INEP',
        'educa.transporte.view' => 'Consultar dados gerais de transporte escolar',
        'educa.transporte.manage' => 'Gerenciamento completo de rotas, veículos, motoristas e alocações',
        'educa.transporte.rotas.view' => 'Consultar rotas e paradas de transporte escolar',
        'educa.transporte.rotas.manage' => 'Cadastrar e atualizar rotas, itinerários e paradas',
        'educa.transporte.rotas.create' => 'Criar novas rotas de transporte escolar',
        'educa.transporte.veiculos.view' => 'Consultar veículos e laudos de vistoria DETRAN',
        'educa.transporte.veiculos.manage' => 'Cadastrar veículos e registrar vistorias semestrais',
        'educa.transporte.condutores.view' => 'Consultar motoristas e monitores credenciados',
        'educa.transporte.condutores.manage' => 'Credenciar condutores com CNH D/E e monitores',
        'educa.transporte.alocacoes.view' => 'Consultar alocações de estudantes no transporte',
        'educa.transporte.alocacoes.manage' => 'Alocar e encerrar vagas de estudantes no transporte',
        'educa.comunicacao.view' => 'Consultar comunicados e ocorrências escolares',
        'educa.comunicacao.manage' => 'Gerenciamento completo de avisos, ocorrências e notificações',
        'educa.comunicacao.avisos.view' => 'Consultar mural de comunicados e avisos oficiais',
        'educa.comunicacao.avisos.manage' => 'Publicar e gerenciar comunicados e circulares',
        'educa.comunicacao.ocorrencias.view' => 'Consultar ocorrências pedagógicas e disciplinares',
        'educa.comunicacao.ocorrencias.manage' => 'Registrar ocorrências e despachar providências',
        'educa.comunicacao.notificacoes.send' => 'Disparar notificações e alertas via Outbox',
    ];

    /**
     * Perfis-template provisionados nos tenants.
     *
     * @var array<string, array{name: string, description: string, permissions: list<string>}>
     */
    public const PERFIS = [
        'admin_educa' => [
            'name' => 'Administrador da Educação',
            'description' => 'Acesso total aos parâmetros escolares, anos letivos, calendários e configurações',
            'permissions' => [
                'educa.view',
                'educa.core.anos_letivos.view',
                'educa.core.anos_letivos.create',
                'educa.core.anos_letivos.update',
                'educa.core.anos_letivos.delete',
                'educa.core.anos_letivos.open',
                'educa.core.anos_letivos.freeze',
                'educa.core.anos_letivos.close',
                'educa.core.anos_letivos.batch',
                'educa.core.calendarios.view',
                'educa.core.calendarios.manage',
                'educa.core.calendarios.publish',
                'educa.core.calendarios.delete',
                'educa.core.motivos_dia.view',
                'educa.core.motivos_dia.manage',
                'educa.secretaria.matriculas.view',
                'educa.secretaria.matriculas.manage',
                'educa.secretaria.alunos.view',
                'educa.secretaria.alunos.manage',
            ],
        ],
        'secretario_educa' => [
            'name' => 'Secretário(a) de Educação / Escola',
            'description' => 'Gestão de anos letivos, etapas, turmas e calendários escolares da rede',
            'permissions' => [
                'educa.view',
                'educa.core.anos_letivos.view',
                'educa.core.anos_letivos.create',
                'educa.core.anos_letivos.update',
                'educa.core.anos_letivos.open',
                'educa.core.calendarios.view',
                'educa.core.calendarios.manage',
                'educa.core.calendarios.publish',
                'educa.core.motivos_dia.view',
                'educa.secretaria.matriculas.view',
                'educa.secretaria.matriculas.manage',
                'educa.secretaria.alunos.view',
                'educa.secretaria.alunos.manage',
            ],
        ],
        'coordenador_educa' => [
            'name' => 'Coordenador(a) Pedagógico(a)',
            'description' => 'Consulta de anos letivos, etapas e gestão de eventos e marcações de calendário',
            'permissions' => [
                'educa.view',
                'educa.core.anos_letivos.view',
                'educa.core.calendarios.view',
                'educa.core.calendarios.manage',
                'educa.core.motivos_dia.view',
            ],
        ],
        'consulta_educa' => [
            'name' => 'Consulta Educação',
            'description' => 'Apenas consulta aos calendários escolares e anos letivos',
            'permissions' => [
                'educa.view',
                'educa.core.anos_letivos.view',
                'educa.core.calendarios.view',
                'educa.core.motivos_dia.view',
            ],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::firstOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        // 1. Cadastra/Atualiza todos os submódulos no catálogo da plataforma
        $modulesMap = [];
        foreach (self::SUBMODULOS as $alias => $submodulo) {
            $modulesMap[$alias] = Module::updateOrCreate(
                ['alias' => $alias],
                [
                    'name' => $submodulo['name'],
                    'description' => $submodulo['description'],
                    'enabled' => true,
                    'monthly_fee_cents' => 0,
                ]
            );
        }

        // 2. Cadastra permissões
        $permissionIds = [];
        foreach (self::PERMISSOES as $slug => $name) {
            $permissionIds[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => 'educa', 'guard_name' => 'web']
            )->id;
        }

        // Associa permissões ao módulo 'educa' no catálogo
        if (isset($modulesMap['educa'])) {
            $modulesMap['educa']->permissions()->sync(array_values($permissionIds));
        }

        // 3. Cadastra os perfis-template no tenant de sistema
        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'educa',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(
                array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions'])
            );
        }

        // 4. Provisiona o módulo 'educa' para os tenants existentes
        $provisioner = app(ModuleRoleProvisioner::class);
        $allTenants = Tenant::all();

        foreach ($allTenants as $tenant) {
            $tenant->modules()->syncWithoutDetaching([
                $modulesMap['educa']->id => [
                    'enabled' => true,
                    'monthly_fee_cents' => 0,
                    'settings' => json_encode([]),
                ],
            ]);

            $provisioner->provisionForTenant($tenant, 'educa');
        }

        $this->informar('SYS-Educa: 7 submódulos registrados no catálogo, permissões e perfis provisionados com sucesso.');
    }

    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}

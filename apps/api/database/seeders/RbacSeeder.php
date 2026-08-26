<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Module;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class RbacSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Obter tenant interno da SYSTRAT
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        // 2. Criar permissões padrão por módulo
        $permissions = [
            'admin' => [
                // Slugs do contrato — Gestão de Usuários & Roles
                'users.systrat.view' => 'Visualizar Usuários SYSTRAT',
                'users.systrat.create' => 'Criar Usuários SYSTRAT',
                'users.systrat.update' => 'Atualizar Usuários SYSTRAT',
                'users.systrat.delete' => 'Excluir Usuários SYSTRAT',
                'users.tenant.view' => 'Visualizar Usuários de Tenants',
                'users.tenant.create' => 'Criar Admin Inicial do Tenant',
                'users.invite' => 'Convidar Usuários',
                'users.deactivate' => 'Desativar Usuários',
                'users.reset_password' => 'Resetar Senha de Usuários',
                'roles.view' => 'Visualizar Roles',
                'roles.create' => 'Criar Roles',
                'roles.update' => 'Atualizar Roles',
                'roles.delete' => 'Excluir Roles',
                'roles.assign' => 'Atribuir Roles',
                'users.manage' => 'Gerenciar Usuários do Tenant (web-client)',
                'analyst.manage' => 'Gerenciar Analistas de Suporte',
                // Slugs legados (backward compat)
                'admin.tenants.view' => 'Visualizar Tenants',
                'admin.tenants.manage' => 'Gerenciar Tenants',
                'admin.users.view' => 'Visualizar Usuários (legado)',
                'admin.users.manage' => 'Gerenciar Usuários (legado)',
                'admin.roles.view' => 'Visualizar Roles (legado)',
                'admin.roles.manage' => 'Gerenciar Roles (legado)',
                'admin.modules.view' => 'Visualizar Módulos',
                'admin.modules.manage' => 'Gerenciar Módulos',
                'admin.menus.view' => 'Visualizar Menus',
                'admin.menus.manage' => 'Gerenciar Menus',
                'admin.audit.view' => 'Visualizar Auditoria',
                'admin.monitoring.view' => 'Visualizar Monitoramento',
            ],
            'contracts' => [
                'contracts.view' => 'Visualizar Contratos',
                'contracts.create' => 'Criar Contratos',
                'contracts.update' => 'Atualizar Contratos',
                'contracts.approve' => 'Aprovar Contratos',
                'contracts.delete' => 'Excluir Contratos',
                'contracts.export' => 'Exportar Contratos',
            ],
            'finance' => [
                'finance.view' => 'Visualizar Financeiro',
                'finance.create' => 'Criar Lançamentos',
                'finance.approve' => 'Aprovar Financeiro',
                'finance.pay' => 'Efetuar Pagamentos',
                'finance.reconcile' => 'Conciliar Financeiro',
                'finance.export' => 'Exportar Financeiro',
            ],
            'procurement' => [
                'procurement.view' => 'Visualizar Licitações',
                'procurement.create' => 'Criar Licitações',
                'procurement.approve' => 'Aprovar Licitações',
            ],
            'documents' => [
                'documents.view' => 'Visualizar Documentos',
                'documents.upload' => 'Upload de Documentos',
                'documents.manage' => 'Gerenciar Documentos',
            ],
            'modules' => [
                'dashboard.view' => 'Visualizar Painel Geral',
                'org.view' => 'Visualizar Organograma',
                'pedagogico.view' => 'Visualizar Módulo Pedagógico',
                'rh.view' => 'Visualizar Recursos Humanos',
                'cemiterios.view' => 'Visualizar Gestão de Cemitérios',
            ],
        ];

        $createdPermissions = [];
        foreach ($permissions as $module => $perms) {
            foreach ($perms as $slug => $name) {
                $perm = Permission::updateOrCreate(
                    ['slug' => $slug],
                    ['name' => $name, 'module' => $module, 'guard_name' => 'web']
                );
                $createdPermissions[$slug] = $perm->id;
            }
        }

        $allPermissionIds = array_values($createdPermissions);

        // 3. Criar roles padrão
        $rolesData = [
            // Roles SYSTRAT (scope = systrat)
            'super_admin' => [
                'name' => 'Super Admin',
                'slug' => 'super_admin',
                'scope' => 'systrat',
                'is_system' => true,
                'description' => 'Acesso total à plataforma SYSTRAT',
                'permissions' => $allPermissionIds,
            ],
            'admin_ops' => [
                'name' => 'Administrador Operacional',
                'slug' => 'admin_ops',
                'scope' => 'systrat',
                'is_system' => true,
                'description' => 'Opera o SaaS (gestão de tenants, contratos, suporte)',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'users.systrat.view', 'users.systrat.create', 'users.systrat.update',
                    'users.tenant.view', 'users.tenant.create', 'users.invite', 'users.deactivate',
                    'roles.view', 'roles.assign',
                    'analyst.manage',
                    'admin.tenants.view', 'admin.tenants.manage',
                    'admin.modules.view', 'admin.menus.view', 'admin.audit.view', 'admin.monitoring.view',
                    'contracts.view', 'contracts.create', 'contracts.update', 'contracts.approve',
                    'finance.view', 'procurement.view', 'documents.view',
                ]),
            ],
            'suporte' => [
                'name' => 'Suporte Técnico',
                'slug' => 'suporte',
                'scope' => 'systrat',
                'is_system' => true,
                'description' => 'Acesso somente leitura (RN-USR-002)',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'users.systrat.view', 'users.tenant.view',
                    'roles.view', 'admin.tenants.view', 'admin.users.view',
                    'admin.modules.view', 'admin.menus.view', 'admin.audit.view', 'admin.monitoring.view',
                    'contracts.view', 'finance.view', 'procurement.view', 'documents.view',
                ]),
            ],
            'support_analyst' => [
                'name' => 'Analista de Suporte',
                'slug' => 'support_analyst',
                'scope' => 'systrat',
                'is_system' => true,
                'description' => 'Acessa apenas os tenants liberados (carteira de clientes) — auditado',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'users.tenant.view', 'roles.view', 'admin.tenants.view',
                    'admin.modules.view', 'admin.audit.view', 'admin.monitoring.view',
                    'contracts.view', 'contracts.create', 'contracts.update',
                    'finance.view', 'procurement.view', 'documents.view', 'documents.upload',
                ]),
            ],
            // Roles de Tenant (scope = tenant, associadas ao tenant SYSTRAT como template)
            'admin_tenant' => [
                'name' => 'Administrador do Tenant',
                'slug' => 'admin_tenant',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Todas as permissões dentro do tenant',
                'permissions' => $allPermissionIds,
            ],
            'gestor' => [
                'name' => 'Gestor',
                'slug' => 'gestor',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Gestão administrativa do tenant',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'contracts.view', 'contracts.create', 'contracts.approve',
                    'finance.view', 'finance.create', 'finance.approve',
                    'procurement.view', 'procurement.create',
                    'documents.view', 'documents.upload',
                    'admin.users.view',
                ]),
            ],
            'pregoeiro' => [
                'name' => 'Pregoeiro',
                'slug' => 'pregoeiro',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Conduz licitações na modalidade pregão',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'procurement.view', 'procurement.create', 'procurement.approve',
                    'contracts.view',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'requisitante' => [
                'name' => 'Requisitante',
                'slug' => 'requisitante',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Solicita compras e serviços',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'procurement.view', 'procurement.create',
                    'contracts.view',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'parecerista' => [
                'name' => 'Parecerista',
                'slug' => 'parecerista',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Emite pareceres técnicos e jurídicos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'procurement.view',
                    'contracts.view',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'fiscal' => [
                'name' => 'Fiscal',
                'slug' => 'fiscal',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Fiscalização de contratos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'contracts.view', 'contracts.update',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'membro' => [
                'name' => 'Membro',
                'slug' => 'membro',
                'scope' => 'tenant',
                'is_system' => true,
                'description' => 'Acesso básico aos módulos ativos do tenant',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'contracts.view', 'finance.view', 'procurement.view', 'documents.view',
                ]),
            ],
            // Roles legadas (mantidas para compatibilidade com outros módulos)
            'ordenador_despesa' => [
                'name' => 'Ordenador de Despesa',
                'slug' => 'ordenador_despesa',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Pode aprovar despesas e contratos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'finance.view', 'finance.create', 'finance.approve',
                    'contracts.view', 'contracts.approve',
                    'documents.view', 'admin.users.view',
                ]),
            ],
            'contador' => [
                'name' => 'Contador',
                'slug' => 'contador',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Acesso a financeiro e contabilidade',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'finance.view', 'finance.reconcile', 'finance.export',
                    'contracts.view', 'documents.view',
                ]),
            ],
            'agente_contratacao' => [
                'name' => 'Agente de Contratação',
                'slug' => 'agente_contratacao',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Gestão completa de contratos e licitações',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'contracts.view', 'contracts.create', 'contracts.update', 'contracts.approve', 'contracts.delete', 'contracts.export',
                    'procurement.view', 'procurement.create', 'procurement.approve',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'fiscal_contrato' => [
                'name' => 'Fiscal de Contrato (legado)',
                'slug' => 'fiscal_contrato',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Fiscalização de contratos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'contracts.view', 'contracts.update',
                    'documents.view', 'documents.upload',
                ]),
            ],
            'consulta' => [
                'name' => 'Consulta',
                'slug' => 'consulta',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Acesso somente leitura aos módulos ativos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'admin.tenants.view', 'admin.users.view', 'admin.roles.view',
                    'contracts.view', 'finance.view', 'procurement.view',
                    'documents.view', 'admin.modules.view', 'admin.menus.view',
                    'admin.audit.view', 'admin.monitoring.view',
                ]),
            ],
            'auditor' => [
                'name' => 'Auditor',
                'slug' => 'auditor',
                'scope' => 'tenant',
                'is_system' => false,
                'description' => 'Acesso a auditoria e visualização de todos os módulos',
                'permissions' => $this->resolveIds($createdPermissions, [
                    'admin.audit.view',
                    'admin.tenants.view', 'admin.users.view', 'admin.roles.view',
                    'contracts.view', 'finance.view', 'procurement.view',
                    'documents.view', 'admin.modules.view', 'admin.menus.view',
                    'admin.monitoring.view',
                ]),
            ],
        ];

        foreach ($rolesData as $roleKey => $roleData) {
            $role = Role::updateOrCreate(
                ['slug' => $roleData['slug'], 'tenant_id' => $sysTenant->id],
                [
                    'name' => $roleData['name'],
                    'scope' => $roleData['scope'],
                    'is_system' => $roleData['is_system'],
                    'description' => $roleData['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync($roleData['permissions']);
        }

        // 4. Criar usuário super_admin inicial
        $superAdmin = User::updateOrCreate(
            ['email' => env('SYSGOV_ADMIN_EMAIL', 'admin@sysgov.local')],
            [
                'name' => 'Administrador SYSGOV',
                'password' => Hash::make(env('SYSGOV_ADMIN_PASSWORD', 'ChangeMe!123456')),
                'is_platform_admin' => true,
                'is_systrat' => true,
                'is_active' => true,
            ]
        );

        // Associar ao tenant SYSTRAT com role super_admin
        $superAdminRole = Role::where('slug', 'super_admin')->where('tenant_id', $sysTenant->id)->first();
        if ($superAdminRole) {
            $superAdmin->tenants()->syncWithoutDetaching([
                $sysTenant->id => ['role_id' => $superAdminRole->id, 'status' => 'active', 'is_primary' => true],
            ]);
            $superAdmin->roles()->syncWithoutDetaching([$superAdminRole->id]);
        }

        $this->command?->info('RBAC seeded: permissions, roles, and super admin created.');
    }

    /**
     * Resolve IDs de permissões a partir dos slugs
     */
    private function resolveIds(array $createdPermissions, array $slugs): array
    {
        $ids = [];
        foreach ($slugs as $slug) {
            if (isset($createdPermissions[$slug])) {
                $ids[] = $createdPermissions[$slug];
            }
        }
        return $ids;
    }
}
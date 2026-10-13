<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Meio Ambiente — Administrador (chefia), Analista de Licenciamento,
 * Fiscal Ambiental e Gestor de Recursos Naturais.
 *
 * Mesmo padrão do RequerimentosRbacSeeder/CursosRbacSeeder: roles "template" com
 * scope=tenant e module='meio_ambiente' no tenant interno da SYSTRAT, clonadas para o
 * tenant pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class MeioAmbienteRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'meio_ambiente.view' => 'Visualizar módulo de Meio Ambiente',
        'meio_ambiente.chefia' => 'Acesso administrativo integral da chefia da Secretaria de Meio Ambiente',
        'meio_ambiente.empreendimentos.manage' => 'Cadastrar e editar empreendimentos sujeitos a licenciamento/fiscalização ambiental',
        'meio_ambiente.licenciamento.manage' => 'Abrir, acompanhar e deferir processos de licenciamento ambiental',
        'meio_ambiente.licenciamento.vistoriar' => 'Registrar vistoria técnica e parecer de processos de licenciamento',
        'meio_ambiente.fiscalizacao.autuar' => 'Emitir autos de infração ambiental e acompanhar parcelamento de multas',
        'meio_ambiente.compensacao.manage' => 'Gerir compensação ambiental (cálculo, pagamentos e destinação)',
        'meio_ambiente.residuos.manage' => 'Gerir geradores de resíduos, coletas e logística reversa',
        'meio_ambiente.areas_protegidas.manage' => 'Cadastrar e editar APPs, reservas legais e unidades de conservação',
        'meio_ambiente.queimadas.registrar' => 'Registrar ocorrências de queimada',
        'meio_ambiente.recursos_hidricos.manage' => 'Gerir outorgas de uso da água e licenças de lançamento de efluentes',
        'meio_ambiente.integracoes.manage' => 'Gerir credenciais de integração com órgãos de controle ambiental',
        'meio_ambiente.auditoria.view' => 'Consultar a trilha de auditoria consolidada do módulo',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'admin_meio_ambiente' => [
            'name' => 'Administrador de Meio Ambiente',
            'description' => 'Acesso administrativo integral ao módulo de Meio Ambiente do órgão',
            'permissions' => [
                'meio_ambiente.view', 'meio_ambiente.chefia', 'meio_ambiente.empreendimentos.manage',
                'meio_ambiente.licenciamento.manage', 'meio_ambiente.licenciamento.vistoriar',
                'meio_ambiente.fiscalizacao.autuar', 'meio_ambiente.compensacao.manage',
                'meio_ambiente.residuos.manage', 'meio_ambiente.areas_protegidas.manage',
                'meio_ambiente.queimadas.registrar', 'meio_ambiente.recursos_hidricos.manage',
                'meio_ambiente.integracoes.manage', 'meio_ambiente.auditoria.view',
            ],
        ],
        'analista_licenciamento_ambiental' => [
            'name' => 'Analista de Licenciamento Ambiental',
            'description' => 'Cadastra empreendimentos e conduz processos de licenciamento ambiental',
            'permissions' => [
                'meio_ambiente.view', 'meio_ambiente.empreendimentos.manage',
                'meio_ambiente.licenciamento.manage', 'meio_ambiente.licenciamento.vistoriar',
            ],
        ],
        'fiscal_ambiental' => [
            'name' => 'Fiscal Ambiental',
            'description' => 'Executa fiscalização ambiental de campo: autos de infração e ocorrências de queimada',
            'permissions' => ['meio_ambiente.view', 'meio_ambiente.fiscalizacao.autuar', 'meio_ambiente.queimadas.registrar'],
        ],
        'gestor_recursos_naturais' => [
            'name' => 'Gestor de Recursos Naturais',
            'description' => 'Gere resíduos sólidos, áreas protegidas, recursos hídricos e compensação ambiental',
            'permissions' => [
                'meio_ambiente.view', 'meio_ambiente.residuos.manage', 'meio_ambiente.areas_protegidas.manage',
                'meio_ambiente.recursos_hidricos.manage', 'meio_ambiente.compensacao.manage',
            ],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $permissionIds = [];
        foreach (self::PERMISSOES as $slug => $name) {
            $permissionIds[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => 'meio_ambiente', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'meio_ambiente',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']));
        }

        $this->informar('Meio Ambiente: permissões e perfis-template (Administrador, Analista de Licenciamento, Fiscal Ambiental, Gestor de Recursos Naturais) semeados.');
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}

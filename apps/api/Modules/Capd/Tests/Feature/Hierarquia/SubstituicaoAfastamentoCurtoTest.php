<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\PendenciaHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

final class SubstituicaoAfastamentoCurtoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{nivel: NivelHierarquia, responsavel: User, servidor: Servidor}
     */
    private function montarArvore(Tenant $tenant, string $regraSubstituicao): array
    {
        $secretaria = OrgUnit::create([
            'tenant_id' => $tenant->id, 'name' => 'Secretaria', 'code' => 'SEC-04', 'type' => 'secretaria', 'level' => 1, 'path' => '0',
        ]);
        $secretaria->update(['path' => (string) $secretaria->id]);

        $departamento = OrgUnit::create([
            'tenant_id' => $tenant->id, 'parent_id' => $secretaria->id, 'name' => 'Departamento', 'code' => 'DEP-04', 'type' => 'departamento', 'level' => 2, 'path' => '0',
        ]);
        $departamento->update(['path' => $secretaria->id . '.' . $departamento->id]);

        $nivel = NivelHierarquia::create([
            'tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Departamento', 'regra_substituicao' => $regraSubstituicao,
        ]);

        $responsavel = User::factory()->create();
        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $departamento->id, 'user_id' => $responsavel->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-004', 'cpf' => '444.444.444-44',
            'nome_completo' => 'Ciclano', 'cargo_efetivo' => 'Auxiliar', 'orgao_lotacao' => 'Departamento',
            'user_id' => $servidorUser->id, 'org_unit_id' => $departamento->id,
        ]);

        return compact('nivel', 'responsavel', 'servidor');
    }

    public function test_regra_substituto_legal_usa_substituto_id_sem_gerar_pendencia(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier4a', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        ['servidor' => $servidor] = $this->montarArvore($tenant, NivelHierarquia::REGRA_SUBSTITUTO_LEGAL);

        $substituto = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-005', 'cpf' => '555.555.555-55',
            'nome_completo' => 'Substituto', 'cargo_efetivo' => 'Auxiliar', 'orgao_lotacao' => 'Departamento',
        ]);

        $afastamento = ServidorAfastamento::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'tipo_afastamento' => 'ferias',
            'data_inicio' => Carbon::now()->subDays(5), 'data_fim' => Carbon::now()->addDays(5),
            'substituto_id' => $substituto->id,
        ]);

        app(HierarquiaService::class)->resolverSubstituicao($afastamento);

        self::assertSame(0, PendenciaHierarquia::query()->where('servidor_id', $servidor->id)->count());
    }

    public function test_regra_substituto_legal_sem_substituto_gera_pendencia(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier4b', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        ['servidor' => $servidor] = $this->montarArvore($tenant, NivelHierarquia::REGRA_SUBSTITUTO_LEGAL);

        $afastamento = ServidorAfastamento::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'tipo_afastamento' => 'ferias',
            'data_inicio' => Carbon::now()->subDays(5), 'data_fim' => Carbon::now()->addDays(5),
        ]);

        app(HierarquiaService::class)->resolverSubstituicao($afastamento);

        self::assertSame(
            1,
            PendenciaHierarquia::query()
                ->where('servidor_id', $servidor->id)
                ->where('tipo_pendencia', PendenciaHierarquia::TIPO_AFASTAMENTO_SEM_SUBSTITUTO)
                ->count()
        );
    }

    public function test_regra_superior_hierarquico_nao_gera_pendencia(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier4c', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        ['servidor' => $servidor] = $this->montarArvore($tenant, NivelHierarquia::REGRA_SUPERIOR_HIERARQUICO);

        $afastamento = ServidorAfastamento::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'tipo_afastamento' => 'ferias',
            'data_inicio' => Carbon::now()->subDays(5), 'data_fim' => Carbon::now()->addDays(5),
        ]);

        app(HierarquiaService::class)->resolverSubstituicao($afastamento);

        self::assertSame(0, PendenciaHierarquia::query()->where('servidor_id', $servidor->id)->count());
    }
}

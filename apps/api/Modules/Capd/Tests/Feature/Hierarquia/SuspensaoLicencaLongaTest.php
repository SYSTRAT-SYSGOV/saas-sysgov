<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Services\HierarquiaService;
use Tests\TestCase;

final class SuspensaoLicencaLongaTest extends TestCase
{
    use RefreshDatabase;

    public function test_afastamento_maior_180_dias_suspende_avaliacao_ativa(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier5', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-006', 'cpf' => '666.666.666-66',
            'nome_completo' => 'Sicrano', 'cargo_efetivo' => 'Auxiliar', 'orgao_lotacao' => 'Departamento',
            'user_id' => $servidorUser->id,
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'ano_referencia' => 2026, 'nome' => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-12-31',
            'data_limite_recurso' => '2027-01-31', 'status' => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => User::factory()->create()->id, 'respostas_fatores' => [],
            'homologada' => false,
        ]);

        self::assertSame(Avaliacao::STATUS_ATIVA, $avaliacao->fresh()->status_avaliacao);

        $afastamento = ServidorAfastamento::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'tipo_afastamento' => 'licenca_saude',
            'data_inicio' => Carbon::now()->subDays(200), 'data_fim' => null,
        ]);

        app(HierarquiaService::class)->resolverSubstituicao($afastamento);

        self::assertSame(Avaliacao::STATUS_SUSPENSA, $avaliacao->fresh()->status_avaliacao);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Modules\Admin\Models\Module;
use Modules\Capd\Events\CicloOpened;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Tests\TestCase;

/**
 * Automação do ciclo (spec: automation — tarefas 2.1, 2.3, 2.4): evento de
 * abertura, alerta de prazo a 5 dias úteis e transição automática de etapa.
 */
final class AutomacaoCicloTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura Automação Teste', 'slug' => 'pref-automacao-teste',
            'type' => 'prefeitura', 'status' => 'active',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $modulo = Module::create(['name' => 'Comissão de Avaliação Periódica', 'alias' => 'capd', 'enabled' => true]);
        $this->tenant->modules()->attach($modulo->id, ['enabled' => true]);
    }

    public function test_criar_ciclo_aberto_dispara_evento_de_abertura(): void
    {
        Event::fake([CicloOpened::class]);

        $this->postJson('/api/capd/ciclos', $this->dadosCiclo(['status' => CicloAvaliacao::STATUS_ABERTO]), $this->comAdmin())
            ->assertCreated();

        Event::assertDispatched(CicloOpened::class);
    }

    public function test_ciclo_planejamento_nao_dispara_evento_de_abertura(): void
    {
        Event::fake([CicloOpened::class]);

        $this->postJson('/api/capd/ciclos', $this->dadosCiclo(['status' => CicloAvaliacao::STATUS_PLANEJAMENTO]), $this->comAdmin())
            ->assertCreated();

        Event::assertNotDispatched(CicloOpened::class);
    }

    public function test_transiciona_etapa_do_ciclo_apos_a_data_limite(): void
    {
        $ciclo = CicloAvaliacao::create($this->dadosCicloModel([
            'status' => CicloAvaliacao::STATUS_ABERTO, 'etapa_cadencia' => 1,
            'data_limite_preenchimento' => today()->subDay()->toDateString(),
        ]));

        $this->artisan('capd:transicionar-etapa-ciclo')->assertSuccessful();

        self::assertSame(2, $ciclo->fresh()->etapa_cadencia);
    }

    public function test_nao_transiciona_etapa_antes_da_data_limite(): void
    {
        $ciclo = CicloAvaliacao::create($this->dadosCicloModel([
            'status' => CicloAvaliacao::STATUS_ABERTO, 'etapa_cadencia' => 1,
            'data_limite_preenchimento' => today()->addDays(10)->toDateString(),
        ]));

        $this->artisan('capd:transicionar-etapa-ciclo')->assertSuccessful();

        self::assertSame(1, $ciclo->fresh()->etapa_cadencia);
    }

    public function test_alerta_de_prazo_notifica_so_quem_nao_submeteu(): void
    {
        $emCincoDiasUteis = today();
        $adicionados = 0;
        while ($adicionados < 5) {
            $emCincoDiasUteis = $emCincoDiasUteis->addDay();
            if (! $emCincoDiasUteis->isWeekend()) {
                $adicionados++;
            }
        }

        $ciclo = CicloAvaliacao::create($this->dadosCicloModel([
            'status' => CicloAvaliacao::STATUS_ABERTO, 'data_limite_preenchimento' => $emCincoDiasUteis->toDateString(),
        ]));

        $pendente = User::create(['name' => 'Servidor Pendente', 'email' => 'pendente@automacao.pr.gov.br', 'password' => bcrypt('secret')]);
        $submetido = User::create(['name' => 'Servidor Submetido', 'email' => 'submetido@automacao.pr.gov.br', 'password' => bcrypt('secret')]);

        Avaliacao::create(['ciclo_id' => $ciclo->id, 'servidor_id' => $pendente->id, 'avaliador_id' => $pendente->id, 'respostas_fatores' => []]);
        Avaliacao::create(['ciclo_id' => $ciclo->id, 'servidor_id' => $submetido->id, 'avaliador_id' => $submetido->id, 'respostas_fatores' => [], 'data_conclusao' => now()]);

        $this->artisan('capd:alertar-prazo-avaliacao')->assertSuccessful();

        self::assertDatabaseHas('capd_notificacoes', ['destinatario_id' => $pendente->id]);
        self::assertDatabaseMissing('capd_notificacoes', ['destinatario_id' => $submetido->id]);
    }

    /**
     * @param array<string, mixed> $sobrescreve
     * @return array<string, mixed>
     */
    private function dadosCiclo(array $sobrescreve = []): array
    {
        return array_merge([
            'nome' => 'Ciclo Automação', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-06-30',
        ], $sobrescreve);
    }

    /**
     * @param array<string, mixed> $sobrescreve
     * @return array<string, mixed>
     */
    private function dadosCicloModel(array $sobrescreve = []): array
    {
        return array_merge([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo Automação', 'ano_referencia' => 2026,
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-06-30', 'data_limite_recurso' => '2026-07-31',
        ], $sobrescreve);
    }

    /** @return array<string, string> */
    private function comAdmin(): array
    {
        $admin = User::create(['name' => 'Admin Automação', 'email' => 'admin@automacao.pr.gov.br', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
        $this->actingAs($admin);

        return ['X-Tenant-ID' => (string) $this->tenant->id];
    }
}

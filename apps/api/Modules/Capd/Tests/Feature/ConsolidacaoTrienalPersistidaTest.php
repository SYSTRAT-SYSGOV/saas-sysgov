<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ConsolidacaoTrienal;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\ConsolidacaoTrienalService;
use Tests\TestCase;

/**
 * RN-02/RN-04/RN-05 — Persistência imutável e versionada da Consolidação Trienal (NFC).
 */
final class ConsolidacaoTrienalPersistidaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private CicloAvaliacao $ciclo;
    private Servidor $servidor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Consolidacao Persistida',
            'slug'   => 'pref-consolidacao-persistida',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $user = User::create([
            'name'     => 'Servidor Consolidacao',
            'email'    => 'servidor.consolidacao@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->servidor = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $user->id,
            'matricula'             => 'MAT-900',
            'cpf'                   => '11122233344',
            'nome_completo'         => 'Servidor Consolidacao',
            'data_nascimento'       => '1980-05-15',
            'data_admissao'         => '2015-02-01',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Contador',
            'orgao_lotacao'         => 'Secretaria de Finanças',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo 2026 (Etapa 3 - Trienal)',
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 3,
            'nota_corte_nfc'  => '70.00',
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_persistir_cria_primeira_versao_da_consolidacao(): void
    {
        $service = app(ConsolidacaoTrienalService::class);

        $consolidacao = $service->persistir($this->servidor, $this->ciclo, [
            'notas_ciclos' => ['2024' => '80.00', '2025' => '75.00', '2026' => '62.00'],
            'nfc'          => '72.33',
            'conceito'     => 'Bom',
            'elegivel'     => true,
        ]);

        $this->assertInstanceOf(ConsolidacaoTrienal::class, $consolidacao);
        $this->assertSame(1, $consolidacao->versao);
        $this->assertSame($this->tenant->id, $consolidacao->tenant_id);
        $this->assertSame($this->servidor->id, $consolidacao->servidor_id);
        $this->assertSame(2024, $consolidacao->trienio);
        $this->assertSame('72.33', $consolidacao->nfc);
        $this->assertSame('Bom', $consolidacao->conceito);
        $this->assertTrue($consolidacao->elegivel_progressao);
        $this->assertSame('70.00', $consolidacao->parametros['nota_corte_nfc']);
    }

    public function test_reprocessar_cria_nova_versao_sem_alterar_a_anterior(): void
    {
        $service = app(ConsolidacaoTrienalService::class);

        $v1 = $service->persistir($this->servidor, $this->ciclo, [
            'notas_ciclos' => ['2024' => '80.00', '2025' => '75.00', '2026' => '62.00'],
            'nfc'          => '72.33',
            'conceito'     => 'Bom',
            'elegivel'     => true,
        ]);

        $v2 = $service->persistir($this->servidor, $this->ciclo, [
            'notas_ciclos' => ['2024' => '80.00', '2025' => '75.00', '2026' => '65.00'],
            'nfc'          => '73.33',
            'conceito'     => 'Bom',
            'elegivel'     => true,
        ]);

        $this->assertSame(1, $v1->fresh()->versao);
        $this->assertSame(2, $v2->versao);
        $this->assertSame('72.33', $v1->fresh()->nfc);
        $this->assertSame('73.33', $v2->nfc);

        $this->assertSame(2, ConsolidacaoTrienal::query()
            ->where('servidor_id', $this->servidor->id)
            ->where('trienio', 2024)
            ->count());
    }
}

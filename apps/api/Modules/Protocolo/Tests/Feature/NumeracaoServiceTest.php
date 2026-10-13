<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Protocolo\Models\Sequencia;
use Modules\Protocolo\Services\NumeracaoService;
use Tests\TestCase;

final class NumeracaoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private NumeracaoService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'status' => 'active']);
        $this->tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'type' => 'prefeitura', 'status' => 'active']);

        $this->service = app(NumeracaoService::class);
    }

    public function test_gera_numeracao_sequencial_por_ano(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $n1 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        $n2 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        $n3 = DB::transaction(fn () => $this->service->proximoNumero(2026));

        self::assertSame(1, $n1);
        self::assertSame(2, $n2);
        self::assertSame(3, $n3);

        app(TenantContext::class)->clear();
    }

    public function test_reinicio_anual_da_numeracao(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        $n2026_1 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        $n2026_2 = DB::transaction(fn () => $this->service->proximoNumero(2026));

        // Novo ano reinicia em 1
        $n2027_1 = DB::transaction(fn () => $this->service->proximoNumero(2027));

        self::assertSame(1, $n2026_1);
        self::assertSame(2, $n2026_2);
        self::assertSame(1, $n2027_1);

        app(TenantContext::class)->clear();
    }

    public function test_isolamento_de_numeracao_entre_tenants(): void
    {
        app(TenantContext::class)->set($this->tenantA);
        $nA1 = DB::transaction(fn () => $this->service->proximoNumero(2026));

        app(TenantContext::class)->set($this->tenantB);
        $nB1 = DB::transaction(fn () => $this->service->proximoNumero(2026));

        self::assertSame(1, $nA1);
        self::assertSame(1, $nB1);

        app(TenantContext::class)->set($this->tenantA);
        $nA2 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        self::assertSame(2, $nA2);

        app(TenantContext::class)->clear();
    }

    public function test_rollback_nao_consome_numero_da_sequencia(): void
    {
        app(TenantContext::class)->set($this->tenantA);

        // 1º sucesso
        $n1 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        self::assertSame(1, $n1);

        // 2º abortado com falha
        try {
            DB::transaction(function () {
                $this->service->proximoNumero(2026);
                throw new Exception('Erro forçado');
            });
        } catch (Exception) {
            // Ignorado intencionalmente
        }

        // Próximo sucesso deve reutilizar o número que deu rollback, sem gerar lacuna
        $n2 = DB::transaction(fn () => $this->service->proximoNumero(2026));
        self::assertSame(2, $n2);

        app(TenantContext::class)->clear();
    }
}

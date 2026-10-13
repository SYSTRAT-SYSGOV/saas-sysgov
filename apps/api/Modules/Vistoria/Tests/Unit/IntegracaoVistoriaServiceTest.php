<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Vistoria\Services\IntegracaoVistoriaService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class IntegracaoVistoriaServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_criar_gera_api_key_unica_e_ativa(): void
    {
        $tenant = $this->criarTenant();

        $integracao = $this->noTenant($tenant, fn () => app(IntegracaoVistoriaService::class)->criar('Sistema Externo X'));

        self::assertSame('Sistema Externo X', $integracao->nome);
        self::assertTrue($integracao->is_active);
        self::assertStringStartsWith('vst_', $integracao->getRawOriginal('api_key'));
        self::assertSame($tenant->id, $integracao->tenant_id);
    }

    public function test_api_key_fica_oculta_na_serializacao(): void
    {
        $tenant = $this->criarTenant();

        $integracao = $this->noTenant($tenant, fn () => app(IntegracaoVistoriaService::class)->criar('Sistema Externo X'));

        self::assertArrayNotHasKey('api_key', $integracao->toArray());
    }

    public function test_revogar_desativa_a_credencial(): void
    {
        $tenant = $this->criarTenant();

        $integracao = $this->noTenant($tenant, function () {
            $service = app(IntegracaoVistoriaService::class);
            $integracao = $service->criar('Sistema Externo X');

            return $service->revogar($integracao);
        });

        self::assertFalse($integracao->is_active);
    }

    public function test_registrar_uso_atualiza_timestamp(): void
    {
        $tenant = $this->criarTenant();

        $integracao = $this->noTenant($tenant, function () {
            $service = app(IntegracaoVistoriaService::class);
            $integracao = $service->criar('Sistema Externo X');
            self::assertNull($integracao->ultimo_uso_em);
            $service->registrarUso($integracao);

            return $integracao->fresh();
        });

        self::assertNotNull($integracao->ultimo_uso_em);
    }
}

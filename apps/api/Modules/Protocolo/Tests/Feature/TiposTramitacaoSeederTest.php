<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Modules\Protocolo\Database\Seeders\TiposTramitacaoDefaultSeeder;
use Modules\Protocolo\Models\TipoTramitacao;
use Tests\TestCase;

final class TiposTramitacaoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_idempotente_cria_6_tipos_padrao_sem_duplicar(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Alfa', 'slug' => 'prefeitura-alfa', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $seeder = new TiposTramitacaoDefaultSeeder();

        // 1ª execução
        $seeder->seedParaTenant($tenant);

        self::assertSame(9, TipoTramitacao::query()->count());

        $entrada = TipoTramitacao::where('slug', 'entrada')->firstOrFail();
        self::assertSame('Entrada', $entrada->nome);
        self::assertSame('aberto', $entrada->efeito_status);

        $conclusao = TipoTramitacao::where('slug', 'conclusao')->firstOrFail();
        self::assertSame('concluido', $conclusao->efeito_status);

        $parecer = TipoTramitacao::where('slug', 'parecer')->firstOrFail();
        self::assertSame(10, $parecer->prazo_dias);

        // 2ª execução (deve ser 100% idempotente, sem duplicar)
        $seeder->seedParaTenant($tenant);

        self::assertSame(9, TipoTramitacao::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_comando_artisan_seedeia_tenant_especifico(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Beta', 'slug' => 'prefeitura-beta', 'type' => 'prefeitura', 'status' => 'active']);

        $exitCode = Artisan::call('protocolo:seed-tipos', [
            '--tenant' => $tenant->id,
        ]);

        self::assertSame(0, $exitCode);

        app(TenantContext::class)->set($tenant);
        self::assertSame(9, TipoTramitacao::query()->count());
        app(TenantContext::class)->clear();
    }
}

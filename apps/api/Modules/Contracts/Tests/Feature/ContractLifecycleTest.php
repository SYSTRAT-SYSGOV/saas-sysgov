<?php

declare(strict_types=1);

namespace Modules\Contracts\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Contracts\Models\Contract;
use Modules\Contracts\Services\ContractLifecycleService;
use Tests\TestCase;

final class ContractLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_contract_addenda_cannot_exceed_legal_limit_of_25_percent(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        $user = User::create(['name' => 'Gestor', 'email' => 'gestor@teste.gov.br', 'password' => bcrypt('secret')]);
        app(TenantContext::class)->set($tenant);
        $this->actingAs($user);

        $service = app(ContractLifecycleService::class);

        // Contrato de R$ 100.000,00 (10.000.000 centavos)
        $contract = $service->createContract([
            'number' => 'CT-2026/001',
            'title' => 'Locação de Software de Gestão',
            'starts_at' => '2026-01-01',
            'ends_at' => '2026-12-31',
            'amount_cents' => 10000000,
            'max_addenda_percent' => 25.00,
            'status' => 'active',
        ]);

        // Aditivo 1 de 20% (R$ 20.000,00 = 2.000.000 centavos) -> Válido
        $service->addAddendum($contract, [
            'number' => 'TA-01/2026',
            'reason' => 'Ampliação do escopo',
            'amount_cents' => 2000000,
            'effective_at' => '2026-06-01',
        ]);

        self::assertSame(2000000, $contract->fresh()->total_addenda_amount_cents);
        self::assertSame(12000000, $contract->fresh()->effective_total_cents);

        // Aditivo 2 de mais 10% (R$ 10.000,00 = 1.000.000 centavos) -> Totalizará 30%, ultrapassando o limite legal de 25%
        $this->expectException(ValidationException::class);
        $service->addAddendum($contract->fresh(), [
            'number' => 'TA-02/2026',
            'reason' => 'Segunda ampliação proibida',
            'amount_cents' => 1000000,
            'effective_at' => '2026-09-01',
        ]);
    }
}

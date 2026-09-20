<?php

declare(strict_types=1);

namespace Modules\Finance\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Finance\Models\BudgetCommitment;
use Modules\Finance\Models\BudgetSettlement;
use Modules\Finance\Services\BudgetExecutionService;
use Modules\Finance\Tests\TestCase;

/**
 * Regressão: BudgetExecutionService::createPayment() validava o novo pagamento contra
 * o valor TOTAL liquidado (settlement->amount_cents), não contra o saldo ainda não pago.
 * Isso permitia múltiplas ordens de pagamento sobre a mesma liquidação somando mais do
 * que o valor empenhado/liquidado.
 */
final class BudgetPaymentOverpaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_cannot_exceed_remaining_unpaid_balance_of_settlement(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Pagamento', 'slug' => 'pref-pagamento', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $commitment = BudgetCommitment::create([
            'commitment_number' => '2026NE000001',
            'commitment_date' => '2026-01-10',
            'supplier_name' => 'Fornecedor Teste',
            'expense_nature' => '3.3.90.39',
            'description' => 'Serviço de teste',
            'amount_cents' => 100000,
            'settled_amount_cents' => 100000,
            'paid_amount_cents' => 0,
            'status' => 'liquidado',
        ]);

        $settlement = BudgetSettlement::create([
            'commitment_id' => $commitment->id,
            'settlement_number' => '2026NL000001',
            'settlement_date' => '2026-01-15',
            'amount_cents' => 100000,
            'status' => 'liquidado',
        ]);

        $service = app(BudgetExecutionService::class);

        $service->createPayment($settlement, ['payment_date' => '2026-01-20', 'amount_cents' => 60000]);

        $this->expectException(ValidationException::class);
        $service->createPayment($settlement, ['payment_date' => '2026-01-21', 'amount_cents' => 60000]);
    }
}

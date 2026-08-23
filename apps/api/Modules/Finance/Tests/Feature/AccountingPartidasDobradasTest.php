<?php

declare(strict_types=1);

namespace Modules\Finance\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Finance\Models\ChartOfAccount;
use Modules\Finance\Services\AccountingService;
use Tests\TestCase;

final class AccountingPartidasDobradasTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounting_entry_enforces_balanced_double_entry_bookkeeping(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        $user = User::create(['name' => 'Contador', 'email' => 'contador@teste.gov.br', 'password' => 'secret']);
        app(TenantContext::class)->set($tenant);

        // Criar contas PCASP
        $caixa = ChartOfAccount::create([
            'code' => '1.1.1.1.1.01.00',
            'name' => 'Caixa e Equivalentes de Caixa',
            'account_type' => 'ativo',
            'nature' => 'devedora',
            'level' => 5,
            'is_synthetic' => false,
        ]);

        $receitaTributaria = ChartOfAccount::create([
            'code' => '4.1.1.1.1.01.00',
            'name' => 'Receita de IPTU',
            'account_type' => 'vpa',
            'nature' => 'credora',
            'level' => 5,
            'is_synthetic' => false,
        ]);

        $service = app(AccountingService::class);

        // 1. Lançamento balanceado (R$ 5.000,00 Débito em Caixa e R$ 5.000,00 Crédito em IPTU)
        $entry = $service->createEntry([
            'entry_date' => '2026-02-15',
            'description' => 'Arrecadação de IPTU',
            'lines' => [
                ['account_id' => $caixa->id, 'type' => 'debito', 'amount_cents' => 500000, 'memo' => 'Entrada em conta movimento'],
                ['account_id' => $receitaTributaria->id, 'type' => 'credito', 'amount_cents' => 500000, 'memo' => 'Reconhecimento VPA'],
            ],
        ], $user->id);

        self::assertSame(500000, $entry->total_amount_cents);

        // 2. Balancete de verificação
        $trialBalance = $service->generateTrialBalance(2026);
        self::assertTrue($trialBalance['summary']['is_balanced']);
        self::assertSame(500000, $trialBalance['summary']['total_debits_cents']);
        self::assertSame(500000, $trialBalance['summary']['total_credits_cents']);

        // 3. Tentativa de lançamento desbalanceado (Débito 5.000,00 vs Crédito 4.000,00) -> Deve falhar com ValidationException
        $this->expectException(ValidationException::class);
        $service->createEntry([
            'entry_date' => '2026-02-16',
            'description' => 'Lançamento com erro de partida dobrada',
            'lines' => [
                ['account_id' => $caixa->id, 'type' => 'debito', 'amount_cents' => 500000],
                ['account_id' => $receitaTributaria->id, 'type' => 'credito', 'amount_cents' => 400000],
            ],
        ], $user->id);
    }
}

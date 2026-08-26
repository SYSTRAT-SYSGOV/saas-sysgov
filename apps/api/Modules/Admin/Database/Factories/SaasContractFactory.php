<?php

declare(strict_types=1);

namespace Modules\Admin\Database\Factories;

use Modules\Admin\Models\SaasContract;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

final class SaasContractFactory extends Factory
{
    protected $model = SaasContract::class;

    public function definition(): array
    {
        return [
            'tenant_id' => \App\Models\Tenant::factory(),
            'number' => 'CT-'.strtoupper(Str::random(8)),
            'title' => 'Contrato de teste '.Str::random(4),
            'plan' => 'standard',
            'starts_at' => now()->subMonth(),
            'ends_at' => now()->addYear(),
            'monthly_fee_cents' => random_int(10000, 1000000),
            'setup_fee_cents' => 0,
            'status' => 'active',
        ];
    }
}

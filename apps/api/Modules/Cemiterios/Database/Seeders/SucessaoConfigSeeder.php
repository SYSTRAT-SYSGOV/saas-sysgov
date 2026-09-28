<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Cemiterios\Models\Tenant;

final class SucessaoConfigSeeder extends Seeder
{
    public function run(): void
    {
        $config = config('cemiterios.sucessao');

        Tenant::query()->chunkById(100, function ($tenants) use ($config) {
            foreach ($tenants as $tenant) {
                $tenant->config()->updateOrCreate(
                    ['chave' => 'sucessao'],
                    ['valor' => $config]
                );
            }
        });
    }
}
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use Illuminate\Database\Seeder;

final class CemiteriosDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CemiteriosRbacSeeder::class,
            CemiteriosDadosDemonstracaoSeeder::class,
        ]);
    }
}

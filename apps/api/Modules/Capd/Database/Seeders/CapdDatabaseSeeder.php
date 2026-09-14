<?php

declare(strict_types=1);

namespace Modules\Capd\Database\Seeders;

use Illuminate\Database\Seeder;

final class CapdDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CapdRbacSeeder::class,
            CapdDadosDemonstracaoSeeder::class,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Modules\Pessoas\Database\Factories\PessoaContatoFactory;
use Modules\Pessoas\Database\Factories\PessoaDocumentoFactory;
use Modules\Pessoas\Database\Factories\PessoaEnderecoFactory;
use Modules\Pessoas\Database\Factories\PessoaFactory;
use Modules\Pessoas\Database\Factories\PessoaVinculoFactory;
use Modules\Pessoas\Models\Pessoa;

final class PessoasDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        /** @var Tenant $tenant */
        $tenant = Tenant::first() ?? Tenant::factory()->create();

        $pessoas = PessoaFactory::new()
            ->count(5)
            ->create(['tenant_id' => $tenant->id]);

        /** @var Pessoa $pessoa */
        foreach ($pessoas as $pessoa) {
            PessoaVinculoFactory::new()->create([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
            ]);

            PessoaDocumentoFactory::new()->create([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
            ]);

            PessoaEnderecoFactory::new()->create([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
            ]);

            PessoaContatoFactory::new()->create([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
                'tipo' => 'email',
                'principal' => true,
            ]);

            PessoaContatoFactory::new()->create([
                'tenant_id' => $tenant->id,
                'pessoa_id' => $pessoa->id,
                'tipo' => 'celular',
                'principal' => true,
            ]);
        }
    }
}

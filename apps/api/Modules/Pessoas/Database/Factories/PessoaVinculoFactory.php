<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;

/**
 * @extends Factory<PessoaVinculo>
 */
final class PessoaVinculoFactory extends Factory
{
    protected $model = PessoaVinculo::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'pessoa_id' => PessoaFactory::new(),
            'tipo_vinculo' => 'servidor_carreira',
            'matricula' => 'MAT-' . random_int(10000, 99999),
            'dados' => ['cargo' => 'Analista Administrativo'],
            'inicio' => '2024-01-01',
            'fim' => null,
        ];
    }
}

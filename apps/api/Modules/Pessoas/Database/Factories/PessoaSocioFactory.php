<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaSocio;

/**
 * @extends Factory<PessoaSocio>
 */
final class PessoaSocioFactory extends Factory
{
    protected $model = PessoaSocio::class;

    public function definition(): array
    {
        return [
            'pessoa_id' => Pessoa::factory()->juridica(),
            'socio_pessoa_id' => Pessoa::factory(),
            'percentual_participacao' => '50.00',
            'papel' => 'socio',
            'data_entrada' => today()->subYear()->toDateString(),
            'data_saida' => null,
        ];
    }
}

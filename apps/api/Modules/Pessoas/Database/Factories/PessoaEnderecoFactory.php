<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaEndereco;

/**
 * @extends Factory<PessoaEndereco>
 */
final class PessoaEnderecoFactory extends Factory
{
    protected $model = PessoaEndereco::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'pessoa_id' => PessoaFactory::new(),
            'cep' => '80000-000',
            'logradouro' => 'Rua das Flores',
            'numero' => (string) random_int(1, 999),
            'complemento' => 'Sala 1',
            'bairro' => 'Centro',
            'cidade' => 'Curitiba',
            'uf' => 'PR',
            'tipo_endereco' => 'residencial',
        ];
    }
}

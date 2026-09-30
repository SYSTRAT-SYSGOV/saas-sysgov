<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaContato;

/**
 * @extends Factory<PessoaContato>
 */
final class PessoaContatoFactory extends Factory
{
    protected $model = PessoaContato::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'pessoa_id' => PessoaFactory::new(),
            'tipo' => 'email',
            'valor' => 'contato-' . Str::random(8) . '@teste.gov.br',
            'principal' => true,
            'autoriza_notificacoes' => true,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Pessoas\Models\PessoaDocumento;

/**
 * @extends Factory<PessoaDocumento>
 */
final class PessoaDocumentoFactory extends Factory
{
    protected $model = PessoaDocumento::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'pessoa_id' => PessoaFactory::new(),
            'tipo' => 'rg',
            'numero' => (string) random_int(10000000, 99999999),
            'orgao_emissor' => 'SSP',
            'uf_emissao' => 'PR',
            'data_emissao' => '2020-01-15',
        ];
    }
}

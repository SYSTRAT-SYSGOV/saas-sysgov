<?php

declare(strict_types=1);

namespace Modules\Pessoas\Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\Pessoas\Models\Pessoa;

/**
 * @extends Factory<Pessoa>
 */
final class PessoaFactory extends Factory
{
    protected $model = Pessoa::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'tipo' => 'fisica',
            'nome' => 'Cidadão ' . Str::random(6),
            'documento' => $this->gerarCpfValido(),
            'nome_social' => null,
            'data_nascimento' => '1990-05-15',
            'sexo' => 'M',
            'nome_mae' => 'Mãe ' . Str::random(6),
            'nome_pai' => 'Pai ' . Str::random(6),
            'estado_civil' => 'solteiro',
            'nacionalidade' => 'Brasileira',
            'naturalidade' => 'Curitiba',
            'nis' => null,
            'status' => 'ativo',
        ];
    }

    /** @return static */
    public function juridica(): self
    {
        $razaoSocial = 'Empresa ' . Str::random(6) . ' Ltda';

        return $this->state(fn (array $attrs) => [
            'tipo' => 'juridica',
            'nome' => $razaoSocial,
            'documento' => $this->gerarCnpjValido(),
            'razao_social' => $razaoSocial,
            'nome_social' => null,
            'nome_mae' => null,
            'nome_pai' => null,
            'estado_civil' => null,
            'data_nascimento' => null,
            'sexo' => null,
        ]);
    }

    private function gerarCnpjValido(): string
    {
        $n = [];
        for ($i = 0; $i < 12; $i++) {
            $n[$i] = random_int(0, 9);
        }

        $pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        $soma = 0;
        foreach ($pesos1 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = $soma % 11;
        $n[12] = $resto < 2 ? 0 : 11 - $resto;

        $soma = 0;
        foreach ($pesos2 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = $soma % 11;
        $n[13] = $resto < 2 ? 0 : 11 - $resto;

        return implode('', $n);
    }

    private function gerarCpfValido(): string
    {
        $n = [];
        for ($i = 0; $i < 9; $i++) {
            $n[$i] = random_int(0, 9);
        }

        $soma = 0;
        for ($i = 0; $i < 9; $i++) {
            $soma += $n[$i] * (10 - $i);
        }
        $resto = ($soma * 10) % 11;
        $n[9] = ($resto === 10) ? 0 : $resto;

        $soma = 0;
        for ($i = 0; $i < 10; $i++) {
            $soma += $n[$i] * (11 - $i);
        }
        $resto = ($soma * 10) % 11;
        $n[10] = ($resto === 10) ? 0 : $resto;

        return implode('', $n);
    }
}

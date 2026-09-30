<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaVinculoTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_pessoa_acumula_multiplos_vinculos_sem_duplicar_cadastro(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $pessoa->vinculos()->create(['tipo_vinculo' => 'servidor_carreira', 'inicio' => '2020-01-01']);
        $pessoa->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => '2020-01-01']);

        self::assertSame(1, Pessoa::count());
        self::assertSame(2, $pessoa->vinculos()->count());
        self::assertEqualsCanonicalizing(
            ['servidor_carreira', 'municipe'],
            $pessoa->vinculos()->pluck('tipo_vinculo')->all(),
        );
    }

    public function test_encerrar_vinculo_grava_fim_sem_excluir_o_registro(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $vinculo = $pessoa->vinculos()->create(['tipo_vinculo' => 'comissionado', 'inicio' => '2024-01-01']);

        $vinculo->update(['fim' => '2026-01-01']);

        self::assertSame(1, $pessoa->vinculos()->count());
        self::assertSame('2026-01-01', $vinculo->refresh()->fim->toDateString());
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaServiceTest extends PessoasTestCase
{
    private Tenant $tenant;
    private PessoaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->service = app(PessoaService::class);
    }

    public function test_busca_por_cpf_com_mascara_encontra_a_pessoa(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $cpf]);

        $cpfMascarado = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
        $resultado = $this->service->listar(['q' => $cpfMascarado]);

        self::assertSame(1, $resultado->total());
        self::assertSame($pessoa->id, $resultado->first()->id);
    }

    public function test_filtro_por_tipo_de_vinculo_retorna_apenas_quem_tem_o_vinculo(): void
    {
        $municipe = Pessoa::create(['nome' => 'Munícipe', 'cpf' => $this->cpfValido()]);
        $municipe->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => today()->toDateString()]);

        $servidor = Pessoa::create(['nome' => 'Servidor', 'cpf' => $this->cpfValido()]);
        $servidor->vinculos()->create(['tipo_vinculo' => 'servidor_carreira', 'inicio' => today()->toDateString()]);

        $resultado = $this->service->listar(['tipo_vinculo' => 'municipe']);

        self::assertSame(1, $resultado->total());
        self::assertSame($municipe->id, $resultado->first()->id);
    }
}

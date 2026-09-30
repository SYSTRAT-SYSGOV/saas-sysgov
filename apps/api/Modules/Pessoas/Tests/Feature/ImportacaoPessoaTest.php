<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;
use Modules\Pessoas\Services\ImportacaoPessoaService;
use Modules\Pessoas\Tests\PessoasTestCase;

final class ImportacaoPessoaTest extends PessoasTestCase
{
    private ImportacaoPessoaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->noTenant($this->criarTenant());
        $this->service = app(ImportacaoPessoaService::class);
    }

    public function test_importacao_com_cpf_existente_atualiza_em_vez_de_duplicar(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Nome Antigo', 'cpf' => $cpf]);

        $resultado = $this->service->importar(['cpf' => $cpf, 'nome' => 'Nome Atualizado']);

        self::assertFalse($resultado['criada']);
        self::assertSame($pessoa->id, $resultado['pessoa']->id);
        self::assertSame('Nome Atualizado', $resultado['pessoa']->nome);
        self::assertSame(1, Pessoa::count());
        self::assertSame(0, PessoaUsuario::count(), 'Importação nunca promove a usuário.');
    }

    public function test_importacao_com_cpf_novo_cria_pessoa_sem_usuario(): void
    {
        $resultado = $this->service->importar(['cpf' => $this->cpfValido(), 'nome' => 'Pessoa Nova']);

        self::assertTrue($resultado['criada']);
        self::assertSame(1, Pessoa::count());
        self::assertSame(0, PessoaUsuario::count());
    }

    public function test_cpf_invalido_nao_cria_pessoa(): void
    {
        $resultado = $this->service->importar(['cpf' => '000.000.000-00', 'nome' => 'Inválido']);

        self::assertNull($resultado['pessoa']);
        self::assertNotNull($resultado['erro']);
        self::assertSame(0, Pessoa::count());
    }
}

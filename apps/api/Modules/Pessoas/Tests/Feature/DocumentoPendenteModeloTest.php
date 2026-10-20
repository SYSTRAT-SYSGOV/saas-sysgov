<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\RegraNegocioException;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Pessoa física sem CPF (spec pessoas: "Cadastro único de pessoa física por tenant"). */
final class DocumentoPendenteModeloTest extends PessoasTestCase
{
    public function test_pessoa_sem_cpf_fica_com_documento_pendente(): void
    {
        $this->noTenant($this->criarTenant());

        $pessoa = Pessoa::create(['nome' => 'Criança Sem CPF', 'data_nascimento' => '2018-03-10']);

        self::assertTrue($pessoa->fresh()->documento_pendente);
        self::assertNull($pessoa->fresh()->documento);
        self::assertNull(DB::table('pessoas')->where('id', $pessoa->id)->value('documento_hash'));
        self::assertSame('—', $pessoa->fresh()->documento_mascarado);
    }

    public function test_duas_pessoas_pendentes_no_mesmo_tenant_sao_aceitas(): void
    {
        $this->noTenant($this->criarTenant());

        Pessoa::create(['nome' => 'Primeira', 'data_nascimento' => '2018-03-10']);
        Pessoa::create(['nome' => 'Segunda', 'data_nascimento' => '2019-04-11']);

        self::assertSame(2, Pessoa::query()->comDocumentoPendente()->count());
    }

    public function test_cpf_repetido_continua_rejeitado(): void
    {
        $this->noTenant($this->criarTenant());
        $cpf = $this->cpfValido();

        Pessoa::create(['nome' => 'Original', 'documento' => $cpf]);

        $this->expectException(QueryException::class);
        Pessoa::create(['nome' => 'Duplicada', 'documento' => $cpf]);
    }

    public function test_pessoa_com_cpf_nao_fica_pendente(): void
    {
        $this->noTenant($this->criarTenant());

        $pessoa = Pessoa::create(['nome' => 'Com CPF', 'documento' => $this->cpfValido()]);

        self::assertFalse($pessoa->fresh()->documento_pendente);
        self::assertNotNull(DB::table('pessoas')->where('id', $pessoa->id)->value('documento_hash'));
    }

    public function test_juridica_sem_cnpj_e_rejeitada(): void
    {
        $this->noTenant($this->criarTenant());

        $this->expectException(RegraNegocioException::class);
        Pessoa::create(['tipo' => 'juridica', 'nome' => 'Empresa', 'razao_social' => 'Empresa Ltda']);
    }

    public function test_migration_nao_altera_registros_existentes(): void
    {
        $this->noTenant($this->criarTenant());
        $pessoa = Pessoa::factory()->create();
        $hash = DB::table('pessoas')->where('id', $pessoa->id)->value('documento_hash');

        self::assertFalse((bool) DB::table('pessoas')->where('id', $pessoa->id)->value('documento_pendente'));
        self::assertNotNull($hash);
    }
}

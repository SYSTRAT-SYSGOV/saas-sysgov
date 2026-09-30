<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\QueryException;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** spec: openspec/changes/cadastro-pessoas-fisicas/specs/pessoas/spec.md */
final class PessoaTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_cadastro_unico_por_tenant_rejeita_cpf_duplicado(): void
    {
        $cpf = $this->cpfValido();
        Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $cpf]);

        $this->expectException(QueryException::class);
        Pessoa::create(['nome' => 'Outra Pessoa', 'cpf' => $cpf]);
    }

    public function test_mesmo_cpf_e_permitido_em_tenants_diferentes(): void
    {
        $cpf = $this->cpfValido();
        Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $cpf]);

        $outroTenant = $this->criarTenant('pref-b');
        $this->noTenant($outroTenant);

        $pessoaB = Pessoa::create(['nome' => 'Maria Titular (B)', 'cpf' => $cpf]);
        self::assertSame($outroTenant->id, $pessoaB->tenant_id);
    }

    public function test_cpf_e_cifrado_e_mascarado(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $cpf]);

        self::assertNotSame($cpf, $pessoa->getRawOriginal('cpf'));
        self::assertStringStartsWith('***.', $pessoa->cpf_mascarado);
        self::assertArrayNotHasKey('cpf', $pessoa->toArray());
    }
}

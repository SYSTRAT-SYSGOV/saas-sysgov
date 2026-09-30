<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDocumento;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaExclusaoTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_exclusao_preserva_o_historico_relacionado(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $vinculo = $pessoa->vinculos()->create(['tipo_vinculo' => 'municipe']);
        $documento = $pessoa->documentos()->create(['tipo' => 'rg', 'numero' => '1234567']);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->deleteJson("/api/pessoas/{$pessoa->id}")
            ->assertOk();

        // Some do Eloquent padrão (soft delete) e das rotas de detalhe.
        self::assertSame(0, Pessoa::count());
        $this->como($this->admin($this->tenant), $this->tenant)->getJson("/api/pessoas/{$pessoa->id}")->assertNotFound();

        // Mas a linha e o histórico relacionado continuam intactos no banco.
        self::assertNotNull(DB::table('pessoas')->find($pessoa->id));
        self::assertNotNull(DB::table('pessoas')->where('id', $pessoa->id)->value('deleted_at'));
        self::assertNotNull(PessoaVinculo::withoutGlobalScopes()->find($vinculo->id));
        self::assertNotNull(PessoaDocumento::withoutGlobalScopes()->find($documento->id));
    }

    public function test_cpf_de_pessoa_excluida_continua_bloqueado_para_reuso(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $cpf]);
        $pessoa->delete();

        $this->expectException(QueryException::class);
        Pessoa::create(['nome' => 'Outra Pessoa', 'cpf' => $cpf]);
    }
}

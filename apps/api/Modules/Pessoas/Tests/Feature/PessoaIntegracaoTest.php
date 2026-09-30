<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PessoaIntegracaoTest extends PessoasTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->noTenant($this->criarTenant());
    }

    public function test_api_token_e_cifrado_no_banco_e_decifrado_de_forma_transparente_na_leitura(): void
    {
        $token = 'token-secreto-123456';
        $integracao = PessoaIntegracao::create([
            'nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'api_token' => $token,
        ]);

        self::assertSame($token, $integracao->refresh()->api_token);

        $bruto = (string) DB::table('pessoas_integracoes')->where('id', $integracao->id)->value('api_token');
        self::assertStringNotContainsString($token, $bruto);
    }

    public function test_api_token_mascarado_nunca_expoe_o_valor_em_texto_plano(): void
    {
        $integracao = PessoaIntegracao::create([
            'nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'api_token' => 'token-secreto-123456',
        ]);

        self::assertSame('••••••••••••••••3456', $integracao->api_token_mascarado);
        self::assertArrayNotHasKey('api_token', $integracao->toArray());
    }
}

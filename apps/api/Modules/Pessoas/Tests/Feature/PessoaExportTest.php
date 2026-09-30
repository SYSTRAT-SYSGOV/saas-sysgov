<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Exportação self-service (padrão SYSGOV, seção 7: exportador construído desde o início). */
final class PessoaExportTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_exporta_pessoas_em_json_com_manifest_versionado(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $pessoa->vinculos()->create(['tipo_vinculo' => 'municipe', 'inicio' => today()->toDateString()]);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)->getJson('/api/pessoas/export');

        $resposta->assertOk()
            ->assertJsonPath('manifest.schema', 'sysgov_pessoas')
            ->assertJsonPath('manifest.total_pessoas', 1)
            ->assertJsonPath('pessoas.0.nome', 'Maria Titular')
            ->assertJsonPath('pessoas.0.vinculos.0.tipo_vinculo', 'municipe');

        self::assertNotEmpty($resposta->json('manifest.checksum_sha256'));
    }

    public function test_exporta_pessoas_em_csv(): void
    {
        Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)->get('/api/pessoas/export?format=csv');

        $resposta->assertOk();
        self::assertStringContainsString('text/csv', $resposta->headers->get('Content-Type'));
        self::assertStringContainsString('Maria Titular', $resposta->getContent());
    }
}

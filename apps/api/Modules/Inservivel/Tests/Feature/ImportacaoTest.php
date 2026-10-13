<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Services\ImportacaoBensService;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;
use Modules\OrgChart\Models\OrgUnit;

/** spec: inservivel › Configurações e importação (D13). Planilhas no formato da SMAD, com dados fictícios. */
final class ImportacaoTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    private function csv(string $conteudo, string $nome = 'planilha.csv'): UploadedFile
    {
        $caminho = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents((string) $caminho, $conteudo);

        return new UploadedFile((string) $caminho, $nome, 'text/csv', null, true);
    }

    /** @return \Illuminate\Testing\TestResponse<\Illuminate\Http\JsonResponse> */
    private function importar(Tenant $tenant, string $conteudo): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->usuario($tenant), $tenant)->post('/api/inservivel/importacao', ['arquivo' => $this->csv($conteudo)]);
    }

    private function bemPorPatrimonio(Tenant $tenant, string $patrimonio): Bem
    {
        return $this->noTenant($tenant, fn (): Bem => Bem::query()->with(['situacao', 'estadoConservacao', 'secretaria', 'setor'])->where('numero_patrimonial', $patrimonio)->firstOrFail());
    }

    public function test_formato_smad_com_virgula_e_utf8(): void
    {
        $tenant = $this->criarTenant();
        $this->noTenant($tenant, fn () => OrgUnit::create(['name' => 'Departamento de Patrimônio', 'code' => 'DPAT', 'type' => 'departamento', 'level' => 3, 'path' => '1.1.2', 'is_active' => true]));
        $csv = "Complemento,Cód. Tombamento,Localização - Descrição,Centro de Custo - Descrição,Aquisição,Incorporação,Valor de Aquisição,Plaqueta Ant.,Nro Série,Características,Valor Contábil,\n"
            . "CADEIRA GIRATÓRIA COM 5 PÉS,900001,INSERVÍVEL 2026 - DEPÓSITO,SMAD - DEPARTAMENTO DE PATRIMÔNIO,14/10/2025,15/10/2025,\"1.500,46\",PL0001,,,\"95,44\",\n";

        $this->importar($tenant, $csv)->assertOk()->assertJsonPath('criados', 1)->assertJsonCount(0, 'pendencias');
        $bem = $this->bemPorPatrimonio($tenant, '900001');
        self::assertSame('CADEIRA GIRATÓRIA COM 5 PÉS', $bem->getAttribute('descricao'));
        self::assertSame(150046, $bem->valor_contabil_cents);
        self::assertSame(9544, $bem->valor_avaliado_cents);
        self::assertSame('SMAD', $bem->secretaria?->acronym);
        self::assertSame('Departamento de Patrimônio', $bem->setor?->name);
        self::assertSame('inservivel', $bem->situacao->papel?->value);
        self::assertSame('2025-10-14', $bem->getAttribute('data_aquisicao')?->format('Y-m-d'));
        self::assertSame('PL0001', $bem->getAttribute('plaqueta_antiga'));
    }

    public function test_ponto_e_virgula_em_iso_8859_1(): void
    {
        $tenant = $this->criarTenant();
        $csv = mb_convert_encoding("Nº Patrimônio;Descrição Detalhada;;Estado;Secretaria Origem;Valor Contábil\n"
            . "152730;APARELHO DE DVD - MÁQUINA;;IRRECUPERÁVEL;SMED;\"R$ 71,70\"\n", 'ISO-8859-1', 'UTF-8');

        $this->importar($tenant, $csv)->assertOk()->assertJsonPath('criados', 1)->assertJsonPath('estados_criados', 1);
        $bem = $this->bemPorPatrimonio($tenant, '152730');
        self::assertSame('APARELHO DE DVD - MÁQUINA', $bem->getAttribute('descricao'));
        self::assertSame('Irrecuperável', $bem->estadoConservacao?->getAttribute('nome'));
        self::assertSame('SMED', $bem->secretaria?->acronym);
        self::assertSame(7170, $bem->valor_avaliado_cents);
    }

    public function test_centro_de_custo_desconhecido_vira_pendencia_e_reimportacao_atualiza(): void
    {
        $tenant = $this->criarTenant();
        $csv = "Cód. Tombamento,Complemento,Centro de Custo - Descrição,Valor Contábil\n"
            . "1,MESA,SMAD,\"10,00\"\n"
            . "2,ARMÁRIO,SECRETARIA DE OBRAS,\"20,00\"\n"
            . ",SEM NÚMERO,SMAD,\n";

        $resposta = $this->importar($tenant, $csv)->assertOk()->assertJsonPath('criados', 1)->assertJsonCount(2, 'pendencias');
        $resposta->assertJsonPath('pendencias.0.linha', 3)->assertJsonPath('pendencias.0.patrimonio', '2');

        $csv2 = "Cód. Tombamento,Complemento,Centro de Custo - Descrição,Plaqueta Ant.,Valor Contábil\n1,OUTRA DESCRIÇÃO,SMAD,PL9,\"99,00\"\n";
        $this->importar($tenant, $csv2)->assertOk()->assertJsonPath('criados', 0)->assertJsonPath('atualizados', 1);
        $bem = $this->bemPorPatrimonio($tenant, '1');
        self::assertSame('MESA', $bem->getAttribute('descricao'));
        self::assertSame('PL9', $bem->getAttribute('plaqueta_antiga'));
        self::assertSame(1000, $bem->valor_avaliado_cents);
    }

    public function test_cabecalho_nao_reconhecido_e_permissao(): void
    {
        $tenant = $this->criarTenant();
        $this->importar($tenant, "Produto,Quantidade\nCaneta,10\n")->assertStatus(422);
        $this->como($this->usuario($tenant, ['inservivel_servidor']), $tenant)->post('/api/inservivel/importacao', ['arquivo' => $this->csv("a\n")])->assertForbidden();
    }

    public function test_conversao_de_valores_em_centavos(): void
    {
        self::assertSame(150046, ImportacaoBensService::centavos('1.500,46'));
        self::assertSame(150046, ImportacaoBensService::centavos('1,500.46'));
        self::assertSame(7246, ImportacaoBensService::centavos('72,46'));
        self::assertSame(7246, ImportacaoBensService::centavos('72.46'));
        self::assertSame(150000, ImportacaoBensService::centavos('1.500'));
        self::assertSame(7170, ImportacaoBensService::centavos('R$ 71,70'));
        self::assertSame(100, ImportacaoBensService::centavos('0,995'));
        self::assertSame(0, ImportacaoBensService::centavos(''));
    }
}

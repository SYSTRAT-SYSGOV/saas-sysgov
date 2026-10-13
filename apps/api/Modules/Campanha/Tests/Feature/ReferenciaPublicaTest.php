<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Campanha\Models\Referencia\RefImportacao;
use Modules\Campanha\Models\Referencia\RefMalha;
use Modules\Campanha\Models\Referencia\RefMandatario;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Services\Referencia\ImportacaoReferenciaService;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;
use ZipArchive;

/** Base territorial pública por UF: importação IBGE/TSE e leitura (grupo 3). */
final class ReferenciaPublicaTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const ANO = 2026;

    /** @var list<string> */
    private array $temporarios = [];

    protected function tearDown(): void
    {
        foreach ($this->temporarios as $arquivo) {
            @unlink($arquivo);
        }
        parent::tearDown();
    }

    /**
     * ZIP com um CSV no padrão do TSE (Latin-1, ";", aspas).
     *
     * @param list<list<string|int>> $linhas
     */
    private function zip(string $entrada, array $linhas): string
    {
        $arquivo = tempnam(sys_get_temp_dir(), 'tse') . '.zip';
        $this->temporarios[] = $arquivo;
        $zip = new ZipArchive();
        $zip->open($arquivo, ZipArchive::CREATE);
        $csv = implode("\n", array_map(fn (array $l): string => implode(';', array_map(fn ($v): string => is_int($v) ? (string) $v : '"' . $v . '"', $l)), $linhas)) . "\n";
        $zip->addFromString($entrada, (string) mb_convert_encoding($csv, 'ISO-8859-1', 'UTF-8'));
        $zip->close();

        return (string) file_get_contents($arquivo);
    }

    /** @return array<string, mixed> */
    private function municipioIbge(int $id, string $nome, string $rgi, string $intermediaria): array
    {
        return ['id' => $id, 'nome' => $nome,
            'microrregiao' => ['nome' => "Micro {$nome}", 'mesorregiao' => ['nome' => "Meso {$nome}"]],
            'regiao-imediata' => ['nome' => $rgi, 'regiao-intermediaria' => ['nome' => $intermediaria]]];
    }

    private function fakeFontes(int $anoEleitoradoDisponivel = self::ANO, bool $sidraFora = false): void
    {
        $eleitorado = $this->zip('eleitorado_local_votacao_' . $anoEleitoradoDisponivel . '_PR.csv', [
            ['CD_MUNICIPIO', 'NM_MUNICIPIO', 'NR_ZONA', 'NR_SECAO', 'QT_ELEITOR_SECAO'],
            ['75353', 'CURITIBA', 1, 10, 300], ['75353', 'CURITIBA', 1, 11, 280], ['75353', 'CURITIBA', 2, 10, 250],
            ['74098', 'ABATIÁ', 59, 1, 310],
            ['77356', 'MUNHOZ DE MELLO', 60, 5, 120],
            ['99999', 'CIDADE INEXISTENTE', 1, 1, 10],
        ]);
        $cabecalho = ['SG_UE', 'NM_UE', 'DS_CARGO', 'NM_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO', 'NR_CANDIDATO', 'DS_SIT_TOT_TURNO', 'DT_ELEICAO'];
        $candidatos = $this->zip('consulta_cand_2024_PR.csv', [
            $cabecalho,
            ['75353', 'CURITIBA', 'PREFEITO', 'EDUARDO PIMENTEL SLAVIERO', 'EDUARDO PIMENTEL', 'PSD', '55', 'ELEITO', '27/10/2024'],
            ['75353', 'CURITIBA', 'VICE-PREFEITO', 'PAULO EDUARDO MARTINS', 'PAULO MARTINS', 'PL', '55', 'ELEITO', '27/10/2024'],
            ['75353', 'CURITIBA', 'PREFEITO', 'CRISTINA GRAEML', 'CRISTINA', 'PMB', '35', 'NÃO ELEITO', '27/10/2024'],
            ['75353', 'CURITIBA', 'VEREADOR', 'VEREADORA UM', 'UM', 'PSD', '55111', 'ELEITO POR QP', '06/10/2024'],
            ['75353', 'CURITIBA', 'VEREADOR', 'VEREADOR DOIS', 'DOIS', 'PL', '22111', 'ELEITO POR MÉDIA', '06/10/2024'],
            ['75353', 'CURITIBA', 'VEREADOR', 'SUPLENTE TRÊS', 'TRÊS', 'PT', '13111', 'SUPLENTE', '06/10/2024'],
            ['74098', 'ABATIÁ', 'PREFEITO', 'PREFEITO 2024', 'ANTIGO', 'PP', '11', 'ELEITO', '06/10/2024'],
            ['74098', 'ABATIÁ', 'PREFEITO', 'PREFEITO SUPLEMENTAR', 'NOVO', 'PL', '22', 'ELEITO', '05/10/2025'],
        ]);

        Http::fake([
            'servicodados.ibge.gov.br/api/v1/localidades/estados/41/municipios' => Http::response([
                $this->municipioIbge(4100103, 'Abatiá', 'Santo Antônio da Platina', 'Londrina'),
                $this->municipioIbge(4106902, 'Curitiba', 'Curitiba', 'Curitiba'),
                $this->municipioIbge(4116208, 'Munhoz de Melo', 'Maringá', 'Maringá'),
            ]),
            'apisidra.ibge.gov.br/*' => $sidraFora ? Http::response('erro', 500) : Http::response([
                ['V' => 'Valor', 'D1C' => 'Município (Código)', 'D3N' => 'Ano'],
                ['V' => '7201', 'D1C' => '4100103', 'D3N' => '2026'],
                ['V' => '1829225', 'D1C' => '4106902', 'D3N' => '2026'],
                ['V' => '...', 'D1C' => '4116208', 'D3N' => '2026'],
            ]),
            'servicodados.ibge.gov.br/api/v3/malhas/*' => Http::response(['type' => 'FeatureCollection', 'features' => [
                ['type' => 'Feature', 'properties' => ['codarea' => '4106902'], 'geometry' => ['type' => 'Polygon', 'coordinates' => [[[-49.3, -25.4], [-49.2, -25.4], [-49.2, -25.5], [-49.3, -25.4]]]]],
            ]]),
            "cdn.tse.jus.br/*/eleitorado_local_votacao_{$anoEleitoradoDisponivel}.zip" => Http::response($eleitorado),
            'cdn.tse.jus.br/*/eleitorado_local_votacao_*' => Http::response('', 404),
            'cdn.tse.jus.br/*/consulta_cand_2024.zip' => Http::response($candidatos),
        ]);
    }

    public function test_importa_municipios_populacao_malha_eleitorado_e_eleitos(): void
    {
        $this->fakeFontes();

        $this->artisan('campanha:importar-referencia', ['uf' => 'PR', '--eleicao' => 2024, '--eleitorado' => self::ANO])->assertSuccessful();

        $curitiba = RefMunicipio::query()->findOrFail(4106902);
        $this->assertSame('Curitiba', $curitiba->regiao_intermediaria);
        $this->assertSame(1829225, $curitiba->populacao);
        $this->assertSame(830, $curitiba->eleitores);
        $this->assertSame(2, (int) $curitiba->getAttribute('zonas'));
        $this->assertSame(3, (int) $curitiba->getAttribute('secoes'));
        $this->assertSame('75353', $curitiba->codigo_tse);
        $this->assertSame(120, RefMunicipio::query()->findOrFail(4116208)->eleitores, 'MUNHOZ DE MELLO (TSE) = Munhoz de Melo (IBGE)');
        $this->assertNull(RefMunicipio::query()->findOrFail(4116208)->populacao, 'sem estimativa ("...")');
        $this->assertTrue(RefMalha::query()->whereKey('PR')->exists());

        $this->assertSame('EDUARDO PIMENTEL', RefMandatario::query()->where('codigo_ibge', 4106902)->where('cargo', 'prefeito')->value('nome_urna'));
        $this->assertSame('PAULO MARTINS', RefMandatario::query()->where('codigo_ibge', 4106902)->where('cargo', 'vice_prefeito')->value('nome_urna'));
        $this->assertSame('NOVO', RefMandatario::query()->where('codigo_ibge', 4100103)->where('cargo', 'prefeito')->value('nome_urna'), 'vale a eleição suplementar mais recente');
        $this->assertSame(2, RefMandatario::query()->where('cargo', 'vereador')->count());

        $registro = RefImportacao::query()->latest('id')->firstOrFail();
        $this->assertSame('concluida', $registro->situacao);
        $this->assertSame(['CIDADE INEXISTENTE'], $registro->resumo['eleitorado_tse']['resultado']['nao_associados']);
    }

    public function test_reimportar_atualiza_sem_duplicar_e_eleitorado_cai_para_o_ano_anterior(): void
    {
        $this->fakeFontes(self::ANO - 1);
        $servico = app(ImportacaoReferenciaService::class);

        $primeira = $servico->importar('PR', 2024);
        $servico->importar('PR', 2024);

        $this->assertSame(self::ANO - 1, $primeira->resumo['eleitorado_tse']['resultado']['ano']);
        $this->assertSame(3, RefMunicipio::query()->count());
        $this->assertSame(1, RefMandatario::query()->where('cargo', 'prefeito')->where('codigo_ibge', 4106902)->count());
        $this->assertSame(2, RefImportacao::query()->count());
    }

    public function test_falha_de_uma_fonte_nao_derruba_as_demais(): void
    {
        $this->fakeFontes(sidraFora: true);

        $registro = app(ImportacaoReferenciaService::class)->importar('PR', 2024, self::ANO);

        $this->assertSame('concluida_com_falhas', $registro->situacao);
        $this->assertFalse($registro->resumo['populacao_ibge']['ok']);
        $this->assertTrue($registro->resumo['eleitos_tse']['ok']);
    }

    public function test_leitura_da_base_publica_pelo_tenant_e_malha_com_etag(): void
    {
        $this->fakeFontes();
        app(ImportacaoReferenciaService::class)->importar('PR', 2024, self::ANO);
        $tenant = $this->criarTenant();
        $consulta = $this->usuario($tenant, ['campanha_consulta']);

        $this->como($consulta, $tenant)->getJson('/api/campanha/referencia/pr/municipios')->assertOk()
            ->assertJsonCount(3, 'municipios')->assertJsonPath('municipios.1.nome', 'Curitiba')
            ->assertJsonPath('ultima_importacao.situacao', 'concluida')
            ->assertJsonMissingPath('municipios.0.nome_normalizado');

        $malha = $this->como($consulta, $tenant)->get('/api/campanha/referencia/PR/malha')->assertOk();
        $etag = (string) $malha->headers->get('ETag');
        $this->assertNotSame('', $etag);
        $this->como($consulta, $tenant)->withHeader('If-None-Match', $etag)->get('/api/campanha/referencia/PR/malha')->assertStatus(304);
        $this->como($consulta, $tenant)->getJson('/api/campanha/referencia/SC/malha')->assertNotFound();

        // Nenhuma rota de tenant escreve na base pública.
        $this->como($this->usuario($tenant), $tenant)->postJson('/api/campanha/referencia/PR/municipios', [])->assertStatus(405);
        $this->como($this->usuario($tenant), $tenant)->putJson('/api/campanha/referencia/PR/malha', [])->assertStatus(405);
        $this->assertSame(3, RefMunicipio::query()->count());
    }
}

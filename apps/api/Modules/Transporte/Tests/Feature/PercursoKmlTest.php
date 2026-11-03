<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Modules\Transporte\Geo\LeitorKml;
use Modules\Transporte\Geo\Percurso;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaPercurso;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;
use Symfony\Component\HttpFoundation\Response;
use ZipArchive;

final class PercursoKmlTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    /** Um grau de latitude mede 111,19 km (raio médio de 6.371,0088 km): 0,2° = 22,24 km. Os três pontos estão alinhados. */
    private const LINHA_RETA = '-49.0,-23.0,0 -49.0,-23.1,0 -49.0,-23.2,0';

    private function kml(string $corpo, string $espaco = 'xmlns="http://www.opengis.net/kml/2.2"'): string
    {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<kml {$espaco}><Document>{$corpo}</Document></kml>";
    }

    private function linha(string $nome, string $coordenadas): string
    {
        return "<Placemark><name>{$nome}</name><LineString><coordinates>{$coordenadas}</coordinates></LineString></Placemark>";
    }

    private function arquivo(string $conteudo, string $nome = 'rota.kml'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nome, $conteudo);
    }

    /** @return array{0: Tenant, 1: User, 2: int} */
    private function cenario(): array
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        return [$t, $g, $this->criarRota($t, $g, $this->criarEscola($t))];
    }

    /** @return TestResponse<Response> */
    private function previa(Tenant $t, User $u, int $rota, string $conteudo, string $nome = 'rota.kml'): TestResponse
    {
        return $this->como($u, $t)->post("/api/transporte/rotas/{$rota}/percurso/previa", ['arquivo' => $this->arquivo($conteudo, $nome)], ['Accept' => 'application/json']);
    }

    // --- Geometria ------------------------------------------------------------------------------------------------

    public function test_distancia_e_simplificacao_batem_com_o_caso_conferido_a_mao(): void
    {
        $pontos = [[-23.0, -49.0], [-23.1, -49.0], [-23.2, -49.0]];

        $this->assertSame(22.24, Percurso::km($pontos));
        $this->assertSame([[-23.0, -49.0], [-23.2, -49.0]], Percurso::simplificar($pontos, 100));
        // uma curva de verdade não some: o ponto do meio está a ~11 km da reta
        $this->assertCount(3, Percurso::simplificar([[-23.0, -49.0], [-23.1, -48.9], [-23.2, -49.0]], 100));
    }

    public function test_simplificacao_respeita_o_teto_de_pontos_subindo_a_tolerancia(): void
    {
        $zigue = [];
        for ($i = 0; $i < 400; $i++) {
            $zigue[] = [-23.0 - $i * 0.001, -49.0 + ($i % 2) * 0.0005];
        }

        $this->assertLessThanOrEqual(50, count(Percurso::simplificar($zigue, 50)));
    }

    // --- Leitura do arquivo ---------------------------------------------------------------------------------------

    public function test_previa_lista_as_linhas_e_avisa_do_que_foi_ignorado(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $kml = $this->kml(
            $this->linha('Trecho 1', self::LINHA_RETA)
            . $this->linha('Trecho 2', '-49.0,-23.2 -49.0,-23.3')
            . '<Placemark><name>Escola</name><Point><coordinates>-49.0,-23.0</coordinates></Point></Placemark>'
            . '<Placemark><name>Área</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-49,-23 -49,-24 -48,-24 -49,-23</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>',
        );

        $r = $this->previa($t, $g, $rota, $kml)->assertOk();

        $this->assertSame(['Trecho 1', 'Trecho 2'], array_column($r->json('data.linhas'), 'nome'));
        $this->assertSame([22.24, 11.12], array_column($r->json('data.linhas'), 'km'));
        $this->assertSame([3, 2], array_column($r->json('data.linhas'), 'pontos_no_arquivo'));
        $this->assertSame([2, 2], array_column($r->json('data.linhas'), 'pontos'));
        $this->assertSame(1, $r->json('data.ignorados.pontos'));
        $this->assertSame(1, $r->json('data.ignorados.poligonos'));
        $this->assertCount(2, $r->json('data.avisos'));
        $this->assertSame(0, RotaPercurso::query()->count());
    }

    public function test_aceita_multigeometry_gx_track_e_namespaces_do_google_earth(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $multi = '<Placemark><name>Ida e volta</name><MultiGeometry>'
            . '<LineString><coordinates>-49.0,-23.0 -49.0,-23.1</coordinates></LineString>'
            . '<LineString><coordinates>-49.0,-23.1 -49.0,-23.2</coordinates></LineString></MultiGeometry></Placemark>';
        $trilha = '<Placemark><name>GPS</name><gx:Track><gx:coord>-49.0 -23.0 0</gx:coord><gx:coord>-49.0 -23.1 0</gx:coord></gx:Track></Placemark>';
        $kml = $this->kml($multi . $trilha, 'xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"');

        $r = $this->previa($t, $g, $rota, $kml)->assertOk();

        $this->assertSame(['Ida e volta (parte 1)', 'Ida e volta (parte 2)', 'GPS'], array_column($r->json('data.linhas'), 'nome'));
        $this->assertSame([11.12, 11.12, 11.12], array_column($r->json('data.linhas'), 'km'));
    }

    public function test_kmz_e_lido_como_o_kml_de_dentro(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $caminho = tempnam(sys_get_temp_dir(), 'kmz');
        $zip = new ZipArchive();
        $zip->open((string) $caminho, ZipArchive::OVERWRITE);
        $zip->addFromString('doc.kml', $this->kml($this->linha('Do KMZ', self::LINHA_RETA)));
        $zip->addFromString('imagens/icone.png', 'x');
        $zip->close();

        $r = $this->previa($t, $g, $rota, (string) file_get_contents((string) $caminho), 'rota.kmz')->assertOk();
        @unlink((string) $caminho);

        $this->assertSame('Do KMZ', $r->json('data.linhas.0.nome'));
        $this->assertSame(22.24, $r->json('data.linhas.0.km'));
    }

    public function test_pares_invalidos_sao_descartados_e_contados(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $kml = $this->kml($this->linha('Com lixo', '-49.0,-23.0 -49.0,120.0 abc,def -49.0,-23.1 0,0'));

        $r = $this->previa($t, $g, $rota, $kml)->assertOk();

        $this->assertSame(3, $r->json('data.ignorados.pares_invalidos'));
        $this->assertSame(2, $r->json('data.linhas.0.pontos_no_arquivo'));
        $this->assertStringContainsString('3 par(es)', implode(' ', $r->json('data.avisos')));
    }

    public function test_traçado_fora_do_brasil_gera_aviso(): void
    {
        [$t, $g, $rota] = $this->cenario();

        $r = $this->previa($t, $g, $rota, $this->kml($this->linha('Europa', '2.35,48.85 2.40,48.90')))->assertOk();

        $this->assertStringContainsString('fora do Brasil', implode(' ', $r->json('data.avisos')));
    }

    /** @return array<string, array{0: string, 1: string}> */
    public static function arquivosRecusados(): array
    {
        return [
            'não é xml' => ['isto não é xml', 'XML válido'],
            'outro xml' => ['<?xml version="1.0"?><gpx></gpx>', 'não é um KML'],
            'sem linhas' => ['<?xml version="1.0"?><kml><Document><Placemark><Point><coordinates>-49,-23</coordinates></Point></Placemark></Document></kml>', 'nenhuma linha'],
            'linha de um ponto' => ['<?xml version="1.0"?><kml><Document><Placemark><LineString><coordinates>-49,-23</coordinates></LineString></Placemark></Document></kml>', 'nenhuma linha'],
            'doctype com entidade externa' => ['<?xml version="1.0"?><!DOCTYPE kml [<!ENTITY x SYSTEM "file:///etc/passwd">]><kml><Document><name>&x;</name></Document></kml>', 'DOCTYPE'],
            'billion laughs' => ['<?xml version="1.0"?><!DOCTYPE l [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;&a;">]><kml>&b;</kml>', 'DOCTYPE'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('arquivosRecusados')]
    public function test_arquivos_invalidos_ou_inseguros_sao_recusados_com_422(string $conteudo, string $trecho): void
    {
        [$t, $g, $rota] = $this->cenario();

        $r = $this->previa($t, $g, $rota, $conteudo)->assertStatus(422);

        $this->assertStringContainsString($trecho, (string) $r->json('error'));
        $this->assertSame(0, RotaPercurso::query()->count());
    }

    public function test_extensao_e_tamanho_sao_validados(): void
    {
        [$t, $g, $rota] = $this->cenario();

        $this->previa($t, $g, $rota, $this->kml($this->linha('x', self::LINHA_RETA)), 'rota.txt')->assertStatus(422);
        $grande = UploadedFile::fake()->create('grande.kml', 6000);
        $this->como($g, $t)->post("/api/transporte/rotas/{$rota}/percurso/previa", ['arquivo' => $grande], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_kmz_com_kml_descompactado_grande_demais_e_recusado(): void
    {
        $caminho = tempnam(sys_get_temp_dir(), 'kmz');
        $zip = new ZipArchive();
        $zip->open((string) $caminho, ZipArchive::OVERWRITE);
        $zip->addFromString('doc.kml', str_repeat(' ', LeitorKml::MAX_BYTES_DESCOMPACTADO + 10));
        $zip->close();

        try {
            $this->expectExceptionMessage('passa de 20 MB');
            (new LeitorKml())->ler((string) $caminho);
        } finally {
            @unlink((string) $caminho);
        }
    }

    public function test_mais_de_cem_linhas_e_recusado(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $corpo = str_repeat($this->linha('L', '-49.0,-23.0 -49.0,-23.1'), 101);

        $r = $this->previa($t, $g, $rota, $this->kml($corpo))->assertStatus(422);

        $this->assertStringContainsString('mais de 100 linhas', (string) $r->json('error'));
    }

    // --- Gravação -------------------------------------------------------------------------------------------------

    public function test_gravar_recalcula_os_km_no_servidor_e_aplica_pavimentado_e_nao_pavimentado(): void
    {
        [$t, $g, $rota] = $this->cenario();

        $r = $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", [
            'coordenadas' => [[-23.0, -49.0], [-23.1, -49.0], [-23.2, -49.0]], 'aplicar_km' => true, 'km_nao_pavimentado' => 6, 'km' => 999,
        ])->assertOk();

        $r->assertJsonPath('data.km', 22.24)->assertJsonPath('data.km_pavimentado', 16.24)->assertJsonPath('data.km_nao_pavimentado', 6)->assertJsonPath('data.aplicou_km', true);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}")->assertJsonPath('data.km_pavimentado', 16.24)->assertJsonPath('data.km_nao_pavimentado', 6)
            ->assertJsonPath('data.km_total', 22.24)->assertJsonPath('data.tem_percurso', true)->assertJsonPath('data.percurso_km', 22.24);
        $evento = AuditLog::query()->where('action', 'rota.percurso_importado')->firstOrFail();
        $this->assertEquals(12.5, $evento->before['km_pavimentado']);
        $this->assertEquals(16.24, $evento->after['km_pavimentado']);
        $this->assertTrue($evento->after['aplicou_km']);
        $this->assertArrayNotHasKey('coordenadas', $evento->after);
    }

    public function test_gravar_sem_aplicar_os_km_nao_mexe_nos_km_da_rota(): void
    {
        [$t, $g, $rota] = $this->cenario();

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk()->assertJsonPath('data.aplicou_km', false);

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}")->assertJsonPath('data.km_pavimentado', 12.5)->assertJsonPath('data.km_nao_pavimentado', 7.25)->assertJsonPath('data.percurso_km', 22.24);
    }

    public function test_nao_pavimentado_maior_que_o_total_e_422(): void
    {
        [$t, $g, $rota] = $this->cenario();

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]], 'aplicar_km' => true, 'km_nao_pavimentado' => 30])->assertStatus(422);

        $this->assertSame(0, RotaPercurso::query()->count());
    }

    public function test_coordenadas_invalidas_sao_recusadas(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $url = "/api/transporte/rotas/{$rota}/percurso";

        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0]]])->assertStatus(422);
        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [120, -49.0]]])->assertStatus(422);
        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], ['a', 'b']]])->assertStatus(422);
        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [-23.1]]])->assertStatus(422);
    }

    public function test_importar_de_novo_substitui_o_percurso_e_remover_apaga_sem_mexer_nos_km(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $url = "/api/transporte/rotas/{$rota}/percurso";
        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk();
        $this->como($g, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [-23.1, -49.0]]])->assertOk();

        $this->assertSame(1, RotaPercurso::query()->count());
        $this->como($g, $t)->getJson($url)->assertJsonPath('data.km', 11.12)->assertJsonCount(2, 'data.coordenadas');

        $this->como($g, $t)->deleteJson($url)->assertOk();

        $this->como($g, $t)->getJson($url)->assertOk()->assertJsonPath('data', null);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}")->assertJsonPath('data.tem_percurso', false)->assertJsonPath('data.km_pavimentado', 12.5);
        $this->assertSame(1, AuditLog::query()->where('action', 'rota.percurso_removido')->count());
        $this->como($g, $t)->deleteJson($url)->assertStatus(422);
    }

    public function test_lista_de_rotas_indica_o_percurso_sem_trazer_as_coordenadas(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk();

        $r = $this->como($g, $t)->getJson('/api/transporte/rotas')->assertOk();

        $this->assertTrue($r->json('data.0.tem_percurso'));
        $this->assertSame(22.24, $r->json('data.0.percurso_km'));
        $this->assertArrayNotHasKey('coordenadas', $r->json('data.0'));
        $this->assertArrayNotHasKey('percurso', $r->json('data.0'));
    }

    public function test_alterar_a_rota_nao_apaga_o_percurso_nem_o_leva_para_a_auditoria(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk();
        $dados = $this->dadosRota($t, $g, Rota::query()->findOrFail($rota)->escola()->firstOrFail(), ['nome' => 'Rota renomeada']);

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}", $dados)->assertOk()->assertJsonPath('data.tem_percurso', true);

        $this->assertStringNotContainsString('-23', (string) json_encode(AuditLog::query()->where('action', 'rota.alterada')->firstOrFail()->after));
    }

    // --- Permissões e isolamento ----------------------------------------------------------------------------------

    public function test_permissoes_consulta_so_ve_o_percurso(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk();
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $url = "/api/transporte/rotas/{$rota}/percurso";

        $this->como($consulta, $t)->getJson($url)->assertOk()->assertJsonPath('data.km', 22.24);
        $this->como($consulta, $t)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertForbidden();
        $this->como($consulta, $t)->deleteJson($url)->assertForbidden();
        $this->previa($t, $consulta, $rota, $this->kml($this->linha('x', self::LINHA_RETA)))->assertForbidden();
    }

    public function test_rota_de_outro_tenant_nao_e_acessivel(): void
    {
        [$t, $g, $rota] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/percurso", ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertOk();
        $b = $this->criarTenant('prefeitura-b');
        $gb = $this->usuario($b, ['transporte_coordenacao']);
        $url = "/api/transporte/rotas/{$rota}/percurso";

        $this->como($gb, $b)->getJson($url)->assertNotFound();
        $this->como($gb, $b)->putJson($url, ['coordenadas' => [[-23.0, -49.0], [-23.2, -49.0]]])->assertNotFound();
        $this->como($gb, $b)->deleteJson($url)->assertNotFound();
        $this->previa($b, $gb, $rota, $this->kml($this->linha('x', self::LINHA_RETA)))->assertNotFound();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Http\Controllers\Publico\CadastroPublicoController;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Models\LinkCaptacao;
use Modules\Campanha\Providers\CampanhaServiceProvider;
use Modules\Campanha\Services\CadastroPublicoService;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;
use ReflectionClass;
use ReflectionNamedType;

/** Links de captação e formulário público com consentimento LGPD (Fase 2A, grupo 2). */
final class CaptacaoTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private function cabo(Campanha $campanha, string $nome = 'Cabo João'): CaboEleitoral
    {
        return $this->naCampanha($campanha, fn (): CaboEleitoral => CaboEleitoral::create(['nome' => $nome, 'codigo_ibge' => 4113700]));
    }

    /** @param array<string, mixed> $extra */
    private function link(Campanha $campanha, array $extra = []): LinkCaptacao
    {
        $cabo = $this->cabo($campanha);

        return $this->naCampanha($campanha, fn (): LinkCaptacao => LinkCaptacao::create(['tipo' => 'cabo', 'cabo_id' => $cabo->id, ...$extra]));
    }

    /** Abre o formulário e devolve o carimbo de início, já "envelhecido" além do tempo mínimo. */
    private function abrir(LinkCaptacao $link): string
    {
        $inicio = (string) $this->getJson("/api/public/campanha/links/{$link->codigo}")->assertOk()->json('iniciado_em');
        $this->travel(10)->seconds();

        return $inicio;
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function envio(string $inicio, array $extra = []): array
    {
        return ['nome' => 'Ana Eleitora', 'codigo_ibge' => 4113700, 'bairro' => 'Centro', 'whatsapp' => '(43) 99999-1234', 'aceite' => true, 'iniciado_em' => $inicio, ...$extra];
    }

    private function eleitores(Campanha $campanha): int
    {
        return (int) $this->naCampanha($campanha, fn () => Eleitor::query()->count());
    }

    // ------------------------------------------------------------------ 2.1 links

    public function test_links_com_codigo_unico_qr_e_responsavel_da_propria_campanha(): void
    {
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $outra = $this->campanha($tenant, ['nome' => 'Outra']);
        $cabo = $this->cabo($campanha);
        $caboDeOutra = $this->cabo($outra, 'Cabo de outra');
        $coordenador = $this->naCampanha($campanha, fn () => Coordenador::create(['nome' => 'Coord. Maria', 'tipo' => 'regional']));
        $gestao = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);

        $a = $gestao()->postJson('/api/campanha/links', ['tipo' => 'cabo', 'cabo_id' => $cabo->id, 'descricao' => 'Feira'])->assertCreated()
            ->assertJsonPath('responsavel', 'Cabo João')->assertJsonPath('cadastros', 0)->json();
        $b = $gestao()->postJson('/api/campanha/links', ['tipo' => 'coordenador', 'coordenador_id' => $coordenador->id])->assertCreated()->json();
        $this->assertMatchesRegularExpression('/^[0-9A-Za-z]{16}$/', $a['codigo']);
        $this->assertNotSame($a['codigo'], $b['codigo']);
        $this->assertStringEndsWith('/cadastro-apoio/' . $a['codigo'], $a['url']);

        $gestao()->postJson('/api/campanha/links', ['tipo' => 'cabo', 'cabo_id' => $caboDeOutra->id])->assertStatus(422)
            ->assertJsonPath('error', 'Cabo eleitoral não encontrado nesta campanha.');

        $qr = $gestao()->get("/api/campanha/links/{$a['id']}/qrcode")->assertOk();
        $this->assertStringStartsWith('image/svg+xml', (string) $qr->headers->get('Content-Type'));
        $this->assertStringContainsString('<svg', (string) $qr->getContent());

        $gestao()->putJson("/api/campanha/links/{$a['id']}", ['ativo' => false])->assertOk()->assertJsonPath('ativo', false);
        $gestao()->getJson('/api/campanha/links')->assertOk()->assertJsonCount(2, 'links');
        $gestao()->deleteJson("/api/campanha/links/{$b['id']}")->assertOk();

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($campanha, $consulta);
        $this->como($consulta, $tenant, $campanha)->getJson('/api/campanha/links')->assertForbidden();
    }

    // ------------------------------------------------------------------ 2.2 criptografia

    public function test_banco_nao_guarda_nome_nem_whatsapp_em_claro(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link), ['demanda' => 'Asfalto na rua 7']))->assertCreated();

        $linha = (array) DB::table('campanha_eleitores')->first();
        foreach (['Ana Eleitora', '43999991234', 'Asfalto'] as $claro) {
            $this->assertStringNotContainsString($claro, json_encode($linha, JSON_UNESCAPED_UNICODE) ?: '');
        }
        $this->assertSame(Eleitor::hashWhatsapp('43 99999 1234'), $linha['whatsapp_hash']);
        $eleitor = $this->naCampanha($campanha, fn (): Eleitor => Eleitor::query()->firstOrFail());
        $this->assertSame('Ana Eleitora', $eleitor->nome);
        $this->assertSame('43999991234', $eleitor->whatsapp);
    }

    // ------------------------------------------------------------------ 2.3 formulário público

    public function test_formulario_mostra_campanha_termo_e_municipios_da_uf(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant, ['lgpd_encarregado_nome' => 'Maria DPO']);
        $link = $this->link($campanha);

        $this->getJson("/api/public/campanha/links/{$link->codigo}")->assertOk()
            ->assertJsonPath('ativo', true)->assertJsonPath('responsavel', 'Cabo João')->assertJsonPath('termo_versao', 1)
            ->assertJsonPath('encarregado.nome', 'Maria DPO')->assertJsonCount(3, 'municipios');
        $this->getJson('/api/public/campanha/links/AAAAAAAAAAAAAAAA')->assertNotFound();
    }

    public function test_cadastro_sem_aceite_e_recusado_e_nada_e_gravado(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link), ['aceite' => false]))
            ->assertStatus(422)->assertJsonValidationErrors('aceite');
        $this->assertSame(0, $this->eleitores($campanha));
    }

    public function test_cadastro_com_localizacao_guarda_responsavel_e_prova_do_consentimento(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link), ['latitude' => -23.3045123, 'longitude' => -51.1696123, 'precisao_m' => 12.4]), ['User-Agent' => 'Celular Teste'])
            ->assertCreated()->assertExactJson(['ok' => true, 'atualizado' => false]);

        $eleitor = $this->naCampanha($campanha, fn (): Eleitor => Eleitor::query()->firstOrFail());
        $this->assertSame($campanha->id, $eleitor->campanha_id);
        $this->assertSame($link->cabo_id, $eleitor->cabo_id);
        $this->assertSame($link->id, $eleitor->link_id);
        $this->assertSame(1, $eleitor->consentimento_versao);
        $this->assertNotNull($eleitor->consentido_em);
        $this->assertSame('127.0.0.1', $eleitor->ip);
        $this->assertSame('Celular Teste', $eleitor->user_agent);
        $this->assertEqualsWithDelta(-23.3045123, $eleitor->latitude, 0.0000001);
        $this->assertSame(12, $eleitor->precisao_m);

        $auditoria = AuditLog::query()->where('action', 'eleitor.cadastrado')->firstOrFail();
        $this->assertStringNotContainsString('Ana', json_encode([$auditoria->before, $auditoria->after]) ?: '');
    }

    public function test_mesmo_whatsapp_atualiza_sem_duplicar(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link)))->assertCreated();
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link), ['nome' => 'Ana Atualizada', 'whatsapp' => '43999991234']))
            ->assertCreated()->assertJsonPath('atualizado', true);

        $this->assertSame(1, $this->eleitores($campanha));
        $this->assertSame('Ana Atualizada', $this->naCampanha($campanha, fn () => Eleitor::query()->firstOrFail()->nome));
    }

    public function test_link_desativado_campanha_encerrada_e_municipio_fora_da_uf(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);
        $inicio = $this->abrir($link);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio, ['codigo_ibge' => 4209102]))
            ->assertStatus(422)->assertJsonPath('error', 'Escolha um município do estado da campanha.');

        $this->naCampanha($campanha, fn () => $link->update(['ativo' => false]));
        $this->getJson("/api/public/campanha/links/{$link->codigo}")->assertOk()->assertJsonPath('ativo', false)
            ->assertJsonPath('mensagem', 'Este link de cadastro não está mais ativo.')->assertJsonMissingPath('termo');
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio))
            ->assertStatus(422)->assertJsonPath('error', 'Este link de cadastro não está mais ativo.');

        $this->naCampanha($campanha, fn () => $link->update(['ativo' => true]));
        $this->noTenant($tenant, fn () => Campanha::query()->whereKey($campanha->id)->update(['status' => 'encerrada']));
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio))
            ->assertStatus(422)->assertJsonPath('error', 'Esta campanha está encerrada e não recebe mais cadastros.');
        $this->assertSame(0, $this->eleitores($campanha));
    }

    public function test_robo_armadilha_e_envio_rapido_demais(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $link = $this->link($campanha);

        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($this->abrir($link), ['site' => 'http://spam']))
            ->assertCreated()->assertJsonPath('ok', true);
        $this->assertSame(0, $this->eleitores($campanha));

        $inicio = (string) $this->getJson("/api/public/campanha/links/{$link->codigo}")->json('iniciado_em');
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio))
            ->assertStatus(422)->assertJsonPath('error', 'Envio rápido demais. Confira os dados e envie de novo.');
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio('123.falso'))
            ->assertStatus(422)->assertJsonPath('error', 'O formulário expirou. Abra o link de novo.');
        $this->assertSame(0, $this->eleitores($campanha));
    }

    public function test_excesso_de_envios_responde_429(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $link = $this->link($this->campanha($tenant));
        $inicio = $this->abrir($link);

        for ($i = 1; $i <= CampanhaServiceProvider::LIMITE_CADASTROS_POR_MINUTO; $i++) {
            $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio, ['whatsapp' => "4399999000{$i}"]))->assertCreated();
        }
        $this->postJson("/api/public/campanha/links/{$link->codigo}/cadastros", $this->envio($inicio, ['whatsapp' => '43999990999']))->assertStatus(429);
    }

    public function test_arquitetura_controllers_publicos_so_dependem_do_servico_de_cadastro(): void
    {
        $arquivos = glob(__DIR__ . '/../../Http/Controllers/Publico/*.php') ?: [];
        $this->assertNotEmpty($arquivos);
        foreach ($arquivos as $arquivo) {
            $classe = 'Modules\\Campanha\\Http\\Controllers\\Publico\\' . basename($arquivo, '.php');
            $dependencias = array_map(
                fn (\ReflectionParameter $p): string => $p->getType() instanceof ReflectionNamedType ? $p->getType()->getName() : 'sem-tipo',
                (new ReflectionClass($classe))->getConstructor()?->getParameters() ?? [],
            );
            $this->assertSame([CadastroPublicoService::class], $dependencias, "{$classe} só pode depender do CadastroPublicoService.");
            $this->assertDoesNotMatchRegularExpression('/Modules\\\\Campanha\\\\Models|\\bDB::|::query\(/', (string) file_get_contents($arquivo));
        }
        $this->assertTrue(class_exists(CadastroPublicoController::class));
    }
}

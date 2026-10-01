<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 3.2 — GET/PUT /api/cursos/configuracao-publica (design D10, D11): habilitar a página,
 * boas-vindas, termo com versão e documento obrigatório, tudo em settings.cursos, sem tocar em
 * mais nada de settings.
 */
final class ConfiguracaoPublicaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
    }

    public function test_configuracao_padrao_comeca_desabilitada_e_sem_termo(): void
    {
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/configuracao-publica')
            ->assertOk()
            ->assertJson([
                'publico_habilitado' => false,
                'boas_vindas' => null,
                'termo' => ['texto' => null, 'versao' => 0],
                'documento_obrigatorio' => false,
            ]);
    }

    public function test_habilita_a_pagina_e_grava_boas_vindas(): void
    {
        $this->como($this->admin, $this->tenant)->putJson('/api/cursos/configuracao-publica', [
            'publico_habilitado' => true,
            'boas_vindas' => 'Bem-vindo aos cursos da Prefeitura!',
            'documento_obrigatorio' => true,
        ])->assertOk()->assertJson([
            'publico_habilitado' => true,
            'boas_vindas' => 'Bem-vindo aos cursos da Prefeitura!',
            'documento_obrigatorio' => true,
        ]);

        $this->assertTrue((bool) data_get($this->tenant->fresh()->settings, 'cursos.publico_habilitado'));
    }

    public function test_cenario_versao_do_termo_so_sobe_quando_o_texto_muda(): void
    {
        $como = $this->como($this->admin, $this->tenant);

        $como->putJson('/api/cursos/configuracao-publica', ['termo' => ['texto' => 'Versão 1 do termo.']])
            ->assertOk()->assertJsonPath('termo.versao', 1)->assertJsonPath('termo.texto', 'Versão 1 do termo.');

        // Reenviar o mesmo texto (o frontend manda o campo inteiro no PUT) não pode inflar a versão.
        $como->putJson('/api/cursos/configuracao-publica', ['termo' => ['texto' => 'Versão 1 do termo.']])
            ->assertOk()->assertJsonPath('termo.versao', 1);

        $como->putJson('/api/cursos/configuracao-publica', ['termo' => ['texto' => 'Versão 2, texto mudou.']])
            ->assertOk()->assertJsonPath('termo.versao', 2)->assertJsonPath('termo.texto', 'Versão 2, texto mudou.');

        // Alterar outro campo sem mandar "termo" não mexe na versão nem no texto gravado.
        $como->putJson('/api/cursos/configuracao-publica', ['publico_habilitado' => true])
            ->assertOk()->assertJsonPath('termo.versao', 2)->assertJsonPath('termo.texto', 'Versão 2, texto mudou.');
    }

    public function test_texto_do_termo_e_das_boas_vindas_e_sanitizado(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->putJson('/api/cursos/configuracao-publica', [
            'boas_vindas' => '<p>Olá</p><script>alert(1)</script>',
            'termo' => ['texto' => '<p>Termo</p><img src=x onerror=alert(1)>'],
        ])->assertOk();

        $this->assertStringNotContainsString('<script', (string) $resposta->json('boas_vindas'));
        $this->assertStringNotContainsString('onerror', (string) $resposta->json('termo.texto'));
    }

    public function test_atualizacao_nao_mexe_em_outras_chaves_de_settings(): void
    {
        $this->tenant->update(['settings' => ['portalTitle' => 'Portal da Prefeitura', 'customPrimaryColor' => '#123456']]);

        $this->como($this->admin, $this->tenant)->putJson('/api/cursos/configuracao-publica', ['publico_habilitado' => true])->assertOk();

        $settings = $this->tenant->fresh()->settings;
        $this->assertSame('Portal da Prefeitura', data_get($settings, 'portalTitle'));
        $this->assertSame('#123456', data_get($settings, 'customPrimaryColor'));
        $this->assertTrue((bool) data_get($settings, 'cursos.publico_habilitado'));
    }

    public function test_atualizacao_registra_auditoria(): void
    {
        $this->como($this->admin, $this->tenant)->putJson('/api/cursos/configuracao-publica', ['publico_habilitado' => true])->assertOk();

        $log = AuditLog::where('action', 'configuracao_publica.atualizada')->where('user_id', $this->admin->id)->firstOrFail();
        $this->assertFalse((bool) data_get($log->before, 'cursos.publico_habilitado'));
        $this->assertTrue((bool) data_get($log->after, 'cursos.publico_habilitado'));
    }

    public function test_cenario_permissao_participante_nao_acessa(): void
    {
        $participante = $this->usuario($this->tenant, ['participante_cursos'], 'Participante');

        $this->como($participante, $this->tenant)->getJson('/api/cursos/configuracao-publica')->assertForbidden();
        $this->como($participante, $this->tenant)->putJson('/api/cursos/configuracao-publica', ['publico_habilitado' => true])->assertForbidden();
    }

    public function test_cenario_permissao_instrutor_nao_acessa(): void
    {
        $instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');

        $this->como($instrutor, $this->tenant)->getJson('/api/cursos/configuracao-publica')->assertForbidden();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 2.3 — ResolvePublicTenant e o grupo `api/public/cursos/{orgao}` (design D7): 404
 * uniforme para órgão inexistente, inativo ou sem a página pública habilitada.
 */
final class PaginaPublicaOrgaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    /** @param array<string, mixed> $settingsExtra */
    private function habilitarPaginaPublica(Tenant $tenant, array $settingsExtra = []): void
    {
        $tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true], ...$settingsExtra]]);
    }

    public function test_pagina_do_orgao_responde_com_nome_e_identidade_quando_habilitada(): void
    {
        $tenant = $this->criarTenant('prefeitura-a');
        $this->habilitarPaginaPublica($tenant, ['portalTitle' => 'Portal da Prefeitura A', 'customPrimaryColor' => '#123456']);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertOk()
            ->assertJsonPath('nome', $tenant->name)
            ->assertJsonPath('slug', $tenant->slug)
            ->assertJsonPath('identidade.titulo', 'Portal da Prefeitura A')
            ->assertJsonPath('identidade.cor_primaria', '#123456')
            ->assertJsonPath('identidade.assinatura_oculta', false);
    }

    /** White-label (CLAUDE.md): a assinatura "Portal SYSGOV" do rodapé respeita hideProviderSignature. */
    public function test_pagina_do_orgao_leva_a_assinatura_oculta(): void
    {
        $tenant = $this->criarTenant('prefeitura-g');
        $this->habilitarPaginaPublica($tenant, ['hideProviderSignature' => true]);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertOk()->assertJsonPath('identidade.assinatura_oculta', true);
    }

    /** Tarefa 3.3 — o texto de boas-vindas configurado em /configuracao-publica (3.2) aparece na página pública. */
    public function test_pagina_do_orgao_leva_o_texto_de_boas_vindas(): void
    {
        $tenant = $this->criarTenant('prefeitura-f');
        $tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true, 'boas_vindas' => 'Bem-vindo!']]]);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertOk()->assertJsonPath('boas_vindas', 'Bem-vindo!');
    }

    /**
     * Achado da revisão do PR (tarefa 7.4): o cadastro externo precisa do termo de verdade pra
     * mostrar o que a pessoa está aceitando, e de saber se o CPF é obrigatório — antes a página
     * pública só levava `boas_vindas`, os outros dois campos de `settings.cursos` configurados
     * em `/configuracao-publica` nunca chegavam ao formulário.
     */
    public function test_pagina_do_orgao_leva_o_termo_de_uso_e_a_exigencia_de_cpf(): void
    {
        $tenant = $this->criarTenant('prefeitura-h');
        $tenant->update(['settings' => ['cursos' => [
            'publico_habilitado' => true,
            'termo' => ['texto' => 'Texto do termo de uso.', 'versao' => 2],
            'documento_obrigatorio' => true,
        ]]]);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertOk()
            ->assertJsonPath('termo_texto', 'Texto do termo de uso.')
            ->assertJsonPath('documento_obrigatorio', true);
    }

    public function test_pagina_do_orgao_sem_termo_configurado_leva_null(): void
    {
        $tenant = $this->criarTenant('prefeitura-i');
        $this->habilitarPaginaPublica($tenant);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertOk()
            ->assertJsonPath('termo_texto', null)
            ->assertJsonPath('documento_obrigatorio', false);
    }

    public function test_orgao_inexistente_responde_404(): void
    {
        $this->getJson('/api/public/cursos/nao-existe')->assertNotFound();
    }

    public function test_orgao_sem_pagina_publica_habilitada_responde_404(): void
    {
        $tenant = $this->criarTenant('prefeitura-b');

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertNotFound();
    }

    public function test_orgao_inativo_responde_404_mesmo_com_pagina_habilitada(): void
    {
        $tenant = $this->criarTenant('prefeitura-c');
        $this->habilitarPaginaPublica($tenant);
        $tenant->update(['status' => 'suspended']);

        $this->getJson("/api/public/cursos/{$tenant->slug}")->assertNotFound();
    }

    public function test_isolamento_entre_orgaos(): void
    {
        $tenantA = $this->criarTenant('prefeitura-d');
        $this->habilitarPaginaPublica($tenantA, ['portalTitle' => 'Portal D']);
        $tenantB = $this->criarTenant('prefeitura-e');
        $this->habilitarPaginaPublica($tenantB, ['portalTitle' => 'Portal E']);

        $this->getJson("/api/public/cursos/{$tenantA->slug}")->assertOk()->assertJsonPath('identidade.titulo', 'Portal D');
        $this->getJson("/api/public/cursos/{$tenantB->slug}")->assertOk()->assertJsonPath('identidade.titulo', 'Portal E');
    }
}

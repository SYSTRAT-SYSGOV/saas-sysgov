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
            ->assertJsonPath('identidade.cor_primaria', '#123456');
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

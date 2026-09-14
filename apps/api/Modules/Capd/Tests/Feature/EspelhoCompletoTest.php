<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\Evidencia;
use Modules\Capd\Models\FatorAvaliacao;
use Tests\TestCase;

/**
 * RF-12 — Espelho Funcional Individual completo: registros do Diário de
 * Bordo (CIT), assinatura digital da ciência do servidor, e histórico
 * consolidado de avaliações anteriores do mesmo servidor.
 */
final class EspelhoCompletoTest extends TestCase
{
    use RefreshDatabase;

    public function test_espelho_traz_cit_assinatura_e_historico_anterior(): void
    {
        $tenant = Tenant::create(['name' => 'Município Espelho Completo', 'slug' => 'pref-espelho-completo', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliador = User::create(['name' => 'Avaliador Espelho Completo', 'email' => 'avaliador.espelho.completo@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $avaliador->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Espelho Completo', 'email' => 'servidor.espelho.completo@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $fator = FatorAvaliacao::create([
            'tenant_id' => $tenant->id, 'codigo' => 'F3', 'nome' => 'Capacidade de Iniciativa',
            'descricao' => 'Aptidão para propor soluções.', 'peso_geral' => 1.0, 'peso_magisterio' => 1.0,
            'ordem' => 3, 'ativo' => true,
        ]);

        $cicloAnterior = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Anterior 2025', 'ano_competencia' => 2025,
            'data_inicio' => '2025-01-01', 'data_fim' => '2025-12-31',
        ]);
        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Espelho Completo 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        // Avaliação anterior (outro ciclo), já concluída — deve aparecer no histórico.
        Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $cicloAnterior->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F3' => ['grau' => 3, 'nota' => 5.0]],
            'nota_final' => '7.00', 'homologada' => true, 'data_conclusao' => now()->subYear(),
        ]);

        // Registro de Diário de Bordo (CIT) no ciclo atual, com evidência.
        $diario = DiarioBordo::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'fator_id' => $fator->id, 'tipo' => 'positivo',
            'data_ocorrencia' => '2026-03-10', 'descricao_fato' => 'Propôs melhoria de processo administrativo.',
        ]);
        Evidencia::create([
            'tenant_id' => $tenant->id, 'diario_bordo_id' => $diario->id, 'nome_arquivo' => 'evidencia.pdf',
            'url_armazenamento' => 's3://evidencias/evidencia.pdf', 'hash_sha256' => hash('sha256', 'evidencia-teste'),
            'mime_type' => 'application/pdf', 'tamanho_bytes' => 1024,
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $avaliador->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F3' => ['grau' => 4, 'nota' => 7.5]],
            'nota_final' => '7.50', 'data_conclusao' => now(),
        ]);

        // Servidor registra ciência (gera o log de auditoria com hash).
        $this->actingAs($servidorUser)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/capd/avaliacoes/{$avaliacao->id}/ciencia", ['tipo' => 'concordancia'])
            ->assertStatus(200);

        $response = $this->actingAs($servidorUser)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson("/api/capd/avaliacoes/{$avaliacao->id}/espelho");

        $response->assertStatus(200);
        $data = $response->json();

        // Registros CIT
        $this->assertCount(1, $data['registros_cit']);
        $this->assertEquals('F3', $data['registros_cit'][0]['fator_codigo']);
        $this->assertCount(1, $data['registros_cit'][0]['evidencias_hashes']);

        // Assinatura digital da ciência
        $this->assertNotNull($data['assinatura_ciencia']);
        $this->assertEquals('concordancia', $data['assinatura_ciencia']['tipo']);
        $this->assertNotNull($data['assinatura_ciencia']['hash_sha256']);

        // Histórico consolidado de avaliações anteriores
        $this->assertCount(1, $data['historico_anterior']);
        $this->assertEquals('7', $data['historico_anterior'][0]['nota_final']);
        $this->assertEquals('Ciclo Anterior 2025', $data['historico_anterior'][0]['ciclo']);

        app(TenantContext::class)->clear();
    }
}

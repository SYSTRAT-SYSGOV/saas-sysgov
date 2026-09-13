<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Tests\TestCase;

final class CapdTenantIsolationEvoluidoTest extends TestCase
{
    use RefreshDatabase;

    public function test_isolamento_de_tenant_em_ciclos_modelos_e_perguntas(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura Alpha', 'slug' => 'tenant-alpha', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura Beta', 'slug' => 'tenant-beta', 'type' => 'prefeitura', 'status' => 'active']);

        // 1. Criar dados no Tenant A
        app(TenantContext::class)->set($tenantA);

        $cicloA = CicloAvaliacao::create([
            'ano_competencia'       => 2026,
            'nome'                  => 'Ciclo Alpha 2026',
            'data_inicio'           => '2026-01-01',
            'data_fim'              => '2026-12-31',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-12-31',
            'data_limite_recurso'   => '2026-12-15',
        ]);

        $modeloA = ModeloFormulario::create([
            'codigo'          => 'MODELO_ALPHA',
            'nome'            => 'Instrumento de Avaliação Alpha',
            'vigencia_inicio' => '2026-01-01',
        ]);

        $perguntaA = Pergunta::create([
            'modelo_id' => $modeloA->id,
            'codigo'    => 'PA_01',
            'enunciado' => 'Pergunta Exclusiva Alpha',
            'tipo'      => Pergunta::TIPO_ESCALA_GRAFICA,
        ]);

        self::assertSame($tenantA->id, $cicloA->tenant_id);
        self::assertSame($tenantA->id, $modeloA->tenant_id);
        self::assertSame($tenantA->id, $perguntaA->tenant_id);

        // 2. Mudar para Tenant B e verificar isolamento
        app(TenantContext::class)->set($tenantB);

        self::assertSame(0, CicloAvaliacao::count());
        self::assertSame(0, ModeloFormulario::count());
        self::assertSame(0, Pergunta::count());

        // Criar no Tenant B com os mesmos códigos (permitido pela chave composta com tenant_id)
        $cicloB = CicloAvaliacao::create([
            'ano_competencia'       => 2026,
            'nome'                  => 'Ciclo Beta 2026',
            'data_inicio'           => '2026-01-01',
            'data_fim'              => '2026-12-31',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-12-31',
            'data_limite_recurso'   => '2026-12-15',
        ]);

        $modeloB = ModeloFormulario::create([
            'codigo'          => 'MODELO_ALPHA', // Mesmo código, mas do Tenant B
            'nome'            => 'Instrumento de Avaliação Beta',
            'vigencia_inicio' => '2026-01-01',
        ]);

        self::assertSame(1, CicloAvaliacao::count());
        self::assertSame(1, ModeloFormulario::count());
        self::assertSame('Ciclo Beta 2026', CicloAvaliacao::firstOrFail()->nome);
        self::assertSame('Instrumento de Avaliação Beta', ModeloFormulario::firstOrFail()->nome);

        // 3. Voltar para Tenant A e verificar integridade
        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, CicloAvaliacao::count());
        self::assertSame('Ciclo Alpha 2026', CicloAvaliacao::firstOrFail()->nome);
        self::assertSame('Instrumento de Avaliação Alpha', ModeloFormulario::firstOrFail()->nome);

        app(TenantContext::class)->clear();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\EmbedTokenService;
use Tests\TestCase;

final class EmbedTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_gera_e_valida_embed_token_para_servidor(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $servidor = Servidor::create([
            'tenant_id'          => $tenant->id,
            'matricula'          => 'SERV-900',
            'cpf'                => '111.222.333-44',
            'nome_completo'      => 'Rodrigo Antunes',
            'cargo_efetivo'      => 'Guarda Municipal',
            'orgao_lotacao'      => 'Segurança Pública',
        ]);

        $embedService = app(EmbedTokenService::class);
        $token = $embedService->generateToken($tenant->id, 'SERV-900', 'autoavaliacao', 60);

        self::assertNotEmpty($token);

        $session = $embedService->validateToken($token);
        self::assertNotNull($session);
        self::assertSame($tenant->id, $session['tenant_id']);
        self::assertSame($servidor->id, $session['servidor_id']);
        self::assertSame('SERV-900', $session['matricula']);
        self::assertSame('autoavaliacao', $session['mode']);

        app(TenantContext::class)->clear();
    }

    public function test_endpoint_embed_context_retorna_dados_headless(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $servidor = Servidor::create([
            'tenant_id'          => $tenant->id,
            'matricula'          => 'HEAD-100',
            'cpf'                => '222.333.444-55',
            'nome_completo'      => 'Camila Rocha',
            'cargo_efetivo'      => 'Assistente Administrativa',
            'orgao_lotacao'      => 'Gabinete',
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id'              => $tenant->id,
            'ano_referencia'         => 2026,
            'nome'                   => 'Ciclo Anual 2026',
            'data_inicio_avaliacao'  => '2026-01-01',
            'data_fim_avaliacao'     => '2026-12-31',
            'data_limite_recurso'    => '2027-01-15',
            'status'                 => 'em_avaliacao',
        ]);

        $embedService = app(EmbedTokenService::class);
        $token = $embedService->generateToken($tenant->id, 'HEAD-100', 'diario-bordo', 30);

        $response = $this->getJson("/api/capd/embed/context?token={$token}");
        $response->assertStatus(200);

        $data = $response->json();
        self::assertSame('diario-bordo', $data['session']['mode']);
        self::assertSame('Camila Rocha', $data['servidor']['nome']);
        self::assertSame('HEAD-100', $data['servidor']['matricula']);
        self::assertSame('Ciclo Anual 2026', $data['ciclo']['nome']);

        app(TenantContext::class)->clear();
    }
}

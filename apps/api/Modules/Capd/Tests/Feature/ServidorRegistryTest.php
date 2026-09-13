<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;
use Modules\Capd\Services\ServidorService;
use Tests\TestCase;

final class ServidorRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_cria_servidor_com_dados_completos_e_mascara_cpf(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $service = app(ServidorService::class);
        $servidor = $service->create([
            'matricula'       => 'MAT-9901',
            'cpf'             => '12345678901',
            'nome_completo'   => 'João da Silva',
            'cargo_efetivo'   => 'Professor de Ensino Fundamental',
            'orgao_lotacao'   => 'Secretaria Municipal de Educação',
            'regime_juridico' => 'estatutario',
            'data_admissao'   => '2020-02-01',
        ]);

        self::assertSame('123.456.789-01', $servidor->cpf);
        self::assertSame('MAT-9901', $servidor->matricula);
        self::assertSame($tenant->id, $servidor->tenant_id);
        self::assertTrue($servidor->isAptoParaAvaliacao());

        app(TenantContext::class)->clear();
    }

    public function test_importacao_em_massa_via_csv(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $csv = "Matricula;Nome Completo;CPF;Cargo Efetivo;Secretaria\n"
             . "1001;Maria Souza;98765432100;Enfermeira;Saude\n"
             . "1002;Carlos Pereira;11122233344;Motorista;Transporte\n";

        $service = app(ServidorService::class);
        $res = $service->importFromCsv($csv);

        self::assertSame(2, $res['total']);
        self::assertSame(2, $res['inseridos']);
        self::assertEmpty($res['erros']);

        self::assertSame(2, Servidor::query()->count());
        $maria = Servidor::where('matricula', '1001')->firstOrFail();
        self::assertSame('Maria Souza', $maria->nome_completo);
        self::assertSame('987.654.321-00', $maria->cpf);

        app(TenantContext::class)->clear();
    }

    public function test_afastamento_registrado_e_relacionado(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $servidor = Servidor::create([
            'tenant_id'          => $tenant->id,
            'matricula'          => '5544',
            'cpf'                => '000.111.222-33',
            'nome_completo'      => 'Ana Clara',
            'cargo_efetivo'      => 'Analista de Sistemas',
            'orgao_lotacao'      => 'Tecnologia da Informação',
            'situacao_funcional' => 'afastado_saude',
        ]);

        ServidorAfastamento::create([
            'tenant_id'          => $tenant->id,
            'servidor_id'        => $servidor->id,
            'tipo_afastamento'   => 'licenca_saude',
            'data_inicio'        => '2026-03-01',
            'data_fim'           => '2026-03-31',
            'dias_afastado'      => 30,
            'suspende_avaliacao' => true,
        ]);

        self::assertCount(1, $servidor->afastamentos);
        self::assertFalse($servidor->isAptoParaAvaliacao());

        app(TenantContext::class)->clear();
    }
}

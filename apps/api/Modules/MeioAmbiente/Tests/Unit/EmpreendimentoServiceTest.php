<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Support\RegraNegocioException;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class EmpreendimentoServiceTest extends TestCase
{
    use RefreshDatabase;

    private EmpreendimentoService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(EmpreendimentoService::class);

        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
    }

    public function test_cria_empreendimento_com_titular_pessoa_fisica(): void
    {
        $titular = Pessoa::factory()->create();

        $empreendimento = $this->service->criarEmpreendimento([
            'titular_pessoa_id' => $titular->id,
            'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_MEDIO,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        self::assertSame($titular->id, $empreendimento->titular_pessoa_id);
        self::assertNull($empreendimento->cnpj);
    }

    public function test_cria_empreendimento_com_titular_pessoa_juridica(): void
    {
        $empreendimento = $this->service->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        self::assertSame('12345678000199', $empreendimento->cnpj);
        self::assertNull($empreendimento->titular_pessoa_id);
    }

    public function test_rejeita_cadastro_sem_titular_pf_nem_cnpj(): void
    {
        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Empreendimento precisa de um titular pessoa física ou jurídica.');

        $this->service->criarEmpreendimento([
            'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_PEQUENO,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }

    public function test_vincula_responsavel_tecnico_com_crea(): void
    {
        $empreendimento = $this->service->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $responsavel = $this->service->vincularResponsavelTecnico($empreendimento, [
            'nome' => 'Engenheira Responsável',
            'registro_profissional' => 'CREA-PR 123456',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);

        self::assertSame($empreendimento->id, $responsavel->empreendimento_id);
        self::assertNull($responsavel->pessoa_id);
    }

    public function test_garante_responsavel_tecnico_antes_de_licenciamento(): void
    {
        $empreendimento = $this->service->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessage('Responsável técnico obrigatório para licenciamento.');

        $this->service->garantirResponsavelTecnico($empreendimento);
    }

    public function test_nao_lanca_excecao_quando_ha_responsavel_tecnico(): void
    {
        $empreendimento = $this->service->criarEmpreendimento([
            'cnpj' => '12345678000199',
            'razao_social' => 'Indústria Exemplo Ltda',
            'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        $this->service->vincularResponsavelTecnico($empreendimento, [
            'nome' => 'Engenheira Responsável',
            'registro_profissional' => 'CREA-PR 123456',
            'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
        ]);

        $this->service->garantirResponsavelTecnico($empreendimento);

        $this->expectNotToPerformAssertions();
    }
}

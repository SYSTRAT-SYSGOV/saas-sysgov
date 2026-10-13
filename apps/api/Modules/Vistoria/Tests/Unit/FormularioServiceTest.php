<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Pergunta;
use Modules\Vistoria\Services\FormularioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class FormularioServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_cria_modelo_de_formulario_com_perguntas(): void
    {
        $tenant = $this->criarTenant();

        $modelo = $this->noTenant($tenant, fn () => app(FormularioService::class)->criarModeloFormulario([
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist Agroindústria',
            'perguntas' => [
                ['enunciado' => 'Possui alvará sanitário vigente?', 'tipo' => Pergunta::TIPO_MULTIPLA_ESCOLHA, 'opcoes' => ['Sim', 'Não'], 'obrigatoria' => true],
                ['enunciado' => 'Observações gerais', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE, 'obrigatoria' => false],
            ],
        ]));

        self::assertSame('agroindustria', $modelo->tipo_fiscalizacao);
        self::assertCount(2, $modelo->perguntas);
        self::assertTrue($modelo->perguntas->first()->obrigatoria);
    }

    public function test_lanca_exception_para_tipo_de_pergunta_invalido(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, fn () => app(FormularioService::class)->criarModeloFormulario([
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist Inválido',
            'perguntas' => [['enunciado' => 'X', 'tipo' => 'tipo_inexistente']],
        ]));
    }

    public function test_resolve_modelo_pela_classificacao_de_atividade_do_local(): void
    {
        $tenant = $this->criarTenant();

        [$modeloEsperado, $ordem] = $this->noTenant($tenant, function () {
            $modelo = app(FormularioService::class)->criarModeloFormulario([
                'tipo_fiscalizacao' => 'agroindustria',
                'nome' => 'Checklist Agroindústria',
                'perguntas' => [['enunciado' => 'P1', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE]],
            ]);

            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Agroindústria Teste',
                'tipo' => LocalFiscalizavel::TIPO_ESTABELECIMENTO_COMERCIAL,
                'classificacao_atividade' => 'agroindustria',
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $ordem = OrdemServico::create([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => now()->addDay()->toDateString(),
            ]);

            return [$modelo, $ordem->load('local')];
        });

        $resolvido = $this->noTenant($tenant, fn () => app(FormularioService::class)->resolverParaOrdem($ordem));

        self::assertNotNull($resolvido);
        self::assertSame($modeloEsperado->id, $resolvido->id);
    }

    public function test_valida_respostas_obrigatorias_lanca_exception_quando_falta_resposta(): void
    {
        $tenant = $this->criarTenant();

        $this->noTenant($tenant, function () {
            $modelo = app(FormularioService::class)->criarModeloFormulario([
                'tipo_fiscalizacao' => 'agroindustria',
                'nome' => 'Checklist',
                'perguntas' => [['enunciado' => 'Obrigatória', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE, 'obrigatoria' => true]],
            ]);

            $this->expectException(\DomainException::class);
            app(FormularioService::class)->validarRespostasObrigatorias($modelo, []);
        });
    }

    public function test_valida_respostas_obrigatorias_passa_quando_todas_respondidas(): void
    {
        $tenant = $this->criarTenant();
        $this->expectNotToPerformAssertions();

        $this->noTenant($tenant, function () {
            $modelo = app(FormularioService::class)->criarModeloFormulario([
                'tipo_fiscalizacao' => 'agroindustria',
                'nome' => 'Checklist',
                'perguntas' => [['enunciado' => 'Obrigatória', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE, 'obrigatoria' => true]],
            ]);
            $pergunta = $modelo->perguntas->first();

            app(FormularioService::class)->validarRespostasObrigatorias($modelo, [
                ['pergunta_id' => $pergunta->id, 'valor' => 'Tudo certo'],
            ]);
        });
    }
}

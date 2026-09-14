<?php

declare(strict_types=1);

namespace Modules\Capd\Tests;

use Illuminate\Support\Collection;
use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Services\CalculadoraNotaService;
use Modules\Capd\Services\TravaElectronicaService;
use PHPUnit\Framework\TestCase;

/**
 * Testes das Travas Eletrônicas Antileniência e Antiprecipitação (spec §3.7).
 *
 * TC-01: Bloqueio de Grau 1 ou 2 sem registro prévio de CIT com evidência.
 * TC-02: Bloqueio de Grau 5 sem registro prévio de CIT com evidência.
 * TC-04: Sucesso para graus intermediários (3 e 4) ou com CIT devidamente comprovado.
 */
final class TravaElectronicaTest extends TestCase
{
    private Collection $fatoresPesos;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fatoresPesos = $this->criarFatoresPesos([
            'F1' => ['id' => 1, 'peso' => 1.5, 'automatizado' => true],
            'F2' => ['id' => 2, 'peso' => 1.5, 'automatizado' => true],
            'F3' => ['id' => 3, 'peso' => 1.0],
            'F4' => ['id' => 4, 'peso' => 1.5],
            'F5' => ['id' => 5, 'peso' => 1.0],
            'F6' => ['id' => 6, 'peso' => 1.5],
            'F7' => ['id' => 7, 'peso' => 1.0],
            'F8' => ['id' => 8, 'peso' => 1.0],
        ]);
    }

    /**
     * Constrói uma Collection de pesos "tipo ModeloFatorPeso" usando stdClass —
     * este é um teste PHPUnit\Framework\TestCase puro (sem bootstrap Laravel) e
     * instanciar Eloquent Model aqui quebra quando roda junto de testes Feature
     * no mesmo processo (ciclo de boot do Eloquent). CalculadoraNotaService só
     * lê ->fator_id, ->peso e ->fator->{codigo,automatizado} via propriedade.
     *
     * @param  array<string, array{id: int, peso: float, automatizado?: bool}>  $definicoes  Keyed by código do fator
     */
    private function criarFatoresPesos(array $definicoes): Collection
    {
        return collect($definicoes)->map(function (array $def, string $codigo): object {
            return (object) [
                'fator_id' => $def['id'],
                'peso'     => $def['peso'],
                'fator'    => (object) [
                    'codigo'       => $codigo,
                    'automatizado' => $def['automatizado'] ?? false,
                ],
            ];
        })->values();
    }

    /**
     * TC-01: Atribuição de Grau 1 sem CIT deve lançar TravaIncidenteCriticoException.
     */
    public function test_tc01_bloqueia_grau_1_sem_cit(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::once())
            ->method('validar')
            ->with('F3', 1, 10, 3)
            ->willThrowException(new TravaIncidenteCriticoException('F3', 'Grau 1 exige CIT prévio.'));

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 4, 'automatizado' => true],
            'F2' => ['grau' => 4, 'automatizado' => true],
            'F3' => ['grau' => 1, 'automatizado' => false],
        ];

        $this->expectException(TravaIncidenteCriticoException::class);
        $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
    }

    /**
     * TC-01b: Atribuição de Grau 2 sem CIT deve lançar TravaIncidenteCriticoException.
     */
    public function test_tc01_bloqueia_grau_2_sem_cit(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::once())
            ->method('validar')
            ->with('F4', 1, 10, 4)
            ->willThrowException(new TravaIncidenteCriticoException('F4', 'Grau 2 exige CIT prévio.'));

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 4, 'automatizado' => true],
            'F2' => ['grau' => 4, 'automatizado' => true],
            'F4' => ['grau' => 2, 'automatizado' => false],
        ];

        $this->expectException(TravaIncidenteCriticoException::class);
        $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
    }

    /**
     * TC-02: Atribuição de Grau 5 sem CIT deve lançar TravaIncidenteCriticoException.
     */
    public function test_tc02_bloqueia_grau_5_sem_cit(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::once())
            ->method('validar')
            ->with('F6', 1, 10, 6)
            ->willThrowException(new TravaIncidenteCriticoException('F6', 'Grau 5 exige CIT prévio com evidência.'));

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 4, 'automatizado' => true],
            'F2' => ['grau' => 4, 'automatizado' => true],
            'F6' => ['grau' => 5, 'automatizado' => false],
        ];

        $this->expectException(TravaIncidenteCriticoException::class);
        $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
    }

    /**
     * TC-04a: Graus intermediários (3 e 4) NUNCA acionam a trava eletrônica.
     */
    public function test_tc04_graus_3_e_4_nao_acionam_trava(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::never())->method('validar');

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 3, 'automatizado' => true],
            'F2' => ['grau' => 4, 'automatizado' => true],
            'F3' => ['grau' => 3, 'automatizado' => false],
            'F4' => ['grau' => 4, 'automatizado' => false],
            'F5' => ['grau' => 3, 'automatizado' => false],
            'F6' => ['grau' => 4, 'automatizado' => false],
            'F7' => ['grau' => 3, 'automatizado' => false],
            'F8' => ['grau' => 4, 'automatizado' => false],
        ];

        $resultado = $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
        self::assertNotEmpty($resultado['nota_final']);
    }

    /**
     * TC-04b: Fatores automatizados (F1 e F2) nunca acionam a trava qualitativa mesmo com grau 5 ou 1.
     */
    public function test_fatores_automatizados_ignoram_trava(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::never())->method('validar');

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 5, 'automatizado' => true],
            'F2' => ['grau' => 1, 'automatizado' => true],
            'F3' => ['grau' => 3, 'automatizado' => false],
        ];

        $resultado = $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
        self::assertNotEmpty($resultado['nota_final']);
    }

    /**
     * TC-04c: Quando o CIT existe e é validado pelo serviço, o cálculo prossegue com sucesso.
     */
    public function test_grau_5_com_cit_valido_prossegue_sucesso(): void
    {
        $travaMock = $this->createMock(TravaElectronicaService::class);
        $travaMock->expects(self::once())
            ->method('validar')
            ->with('F6', 1, 10, 6); // Não lança exceção

        $calculadora = new CalculadoraNotaService($travaMock);

        $respostas = [
            'F1' => ['grau' => 4, 'automatizado' => true],
            'F2' => ['grau' => 4, 'automatizado' => true],
            'F6' => ['grau' => 5, 'automatizado' => false],
        ];

        $resultado = $calculadora->calcular($respostas, $this->fatoresPesos, 1, 10);
        self::assertNotEmpty($resultado['nota_final']);
        self::assertSame(5, $resultado['detalhamento']['F6']['grau']);
    }
}

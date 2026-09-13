<?php

declare(strict_types=1);

namespace Modules\Capd\Tests;

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
    private array $fatores;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fatores = [
            'F1' => ['id' => 1, 'peso_geral' => 1.5, 'peso_magisterio' => 1.5, 'automatizado' => true],
            'F2' => ['id' => 2, 'peso_geral' => 1.5, 'peso_magisterio' => 1.0, 'automatizado' => true],
            'F3' => ['id' => 3, 'peso_geral' => 1.0, 'peso_magisterio' => 1.0, 'automatizado' => false],
            'F4' => ['id' => 4, 'peso_geral' => 1.5, 'peso_magisterio' => 1.5, 'automatizado' => false],
            'F5' => ['id' => 5, 'peso_geral' => 1.0, 'peso_magisterio' => 1.0, 'automatizado' => false],
            'F6' => ['id' => 6, 'peso_geral' => 1.5, 'peso_magisterio' => 2.0, 'automatizado' => false],
            'F7' => ['id' => 7, 'peso_geral' => 1.0, 'peso_magisterio' => 1.5, 'automatizado' => false],
            'F8' => ['id' => 8, 'peso_geral' => 1.0, 'peso_magisterio' => 0.5, 'automatizado' => false],
        ];
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
        $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
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
        $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
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
        $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
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

        $resultado = $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
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

        $resultado = $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
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

        $resultado = $calculadora->calcular($respostas, $this->fatores, 'GERAL', 1, 10);
        self::assertNotEmpty($resultado['nota_final']);
        self::assertSame(5, $resultado['detalhamento']['F6']['grau']);
    }
}

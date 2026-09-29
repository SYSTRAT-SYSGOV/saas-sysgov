<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use Modules\Cemiterios\Services\CadeiaSucessoriaService;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class CadeiaSucessoriaServiceTest extends CemiteriosTestCase
{
    private CadeiaSucessoriaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CadeiaSucessoriaService();
    }

    public function test_validarOrdemPrioridade_aceita_ordem_padrao_valida(): void
    {
        $herdeiros = [
            ['nome' => 'Cônjuge', 'parentesco' => Parentesco::Companheiro, 'ordem' => 1],
            ['nome' => 'Filho 1', 'parentesco' => Parentesco::Filho, 'ordem' => 1],
            ['nome' => 'Filho 2', 'parentesco' => Parentesco::Filho, 'ordem' => 2],
        ];

        $this->expectNotToPerformAssertions();
        $this->service->validarOrdemPrioridade($herdeiros);
    }

    public function test_validarOrdemPrioridade_rejeita_grupo_fora_de_ordem(): void
    {
        // Filho (prioridade 2) antes de Companheiro (prioridade 1) na lista não importa,
        // mas o índice de prioridade dos grupos presentes deve ser crescente.
        $herdeiros = [
            ['nome' => 'Pai', 'parentesco' => Parentesco::Pai, 'ordem' => 1],   // prioridade 3
            ['nome' => 'Cônjuge', 'parentesco' => Parentesco::Companheiro, 'ordem' => 1], // prioridade 1 -> fora de ordem
        ];

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessageMatches('/prioridade/');
        $this->service->validarOrdemPrioridade($herdeiros);
    }

    public function test_validarOrdemPrioridade_rejeita_ordem_nao_sequencial_dentro_do_grupo(): void
    {
        $herdeiros = [
            ['nome' => 'Filho 1', 'parentesco' => Parentesco::Filho, 'ordem' => 1],
            ['nome' => 'Filho 2', 'parentesco' => Parentesco::Filho, 'ordem' => 3], // deveria ser 2
        ];

        $this->expectException(RegraNegocioException::class);
        $this->expectExceptionMessageMatches('/sequencial/');
        $this->service->validarOrdemPrioridade($herdeiros);
    }

    public function test_validarOrdemPrioridade_respeita_ordem_customizada_do_tenant(): void
    {
        // Tenant customizado: Filho antes de Companheiro.
        $ordemTenant = [Parentesco::Filho, Parentesco::Companheiro, Parentesco::Pai];

        $herdeiros = [
            ['nome' => 'Filho', 'parentesco' => Parentesco::Filho, 'ordem' => 1],
            ['nome' => 'Cônjuge', 'parentesco' => Parentesco::Companheiro, 'ordem' => 1],
        ];

        $this->service->validarOrdemPrioridade($herdeiros, $ordemTenant);

        // A mesma lista falha com a ordem padrão (Companheiro vem antes de Filho).
        $herdeirosOrdemPadrao = [
            ['nome' => 'Filho', 'parentesco' => Parentesco::Filho, 'ordem' => 1],
            ['nome' => 'Cônjuge', 'parentesco' => Parentesco::Companheiro, 'ordem' => 1],
        ];
        $this->expectException(RegraNegocioException::class);
        $this->service->validarOrdemPrioridade($herdeirosOrdemPadrao);
    }

    public function test_validarOrdemPrioridade_lista_vazia_nao_lanca(): void
    {
        $this->expectNotToPerformAssertions();
        $this->service->validarOrdemPrioridade([]);
    }

    public function test_validarTitularUnico_aceita_um_titular(): void
    {
        $this->expectNotToPerformAssertions();
        $this->service->validarTitularUnico([
            ['titular_indicado' => true],
            ['titular_indicado' => false],
        ]);
    }

    public function test_validarTitularUnico_rejeita_mais_de_um_titular(): void
    {
        $this->expectException(RegraNegocioException::class);
        $this->service->validarTitularUnico([
            ['titular_indicado' => true],
            ['titular_indicado' => true],
        ]);
    }

    public function test_validarDireitoRepresentacao_exige_representado_quando_habilitado(): void
    {
        $this->expectException(RegraNegocioException::class);
        $this->service->validarDireitoRepresentacao([
            ['direito_representacao' => true, 'herdeiro_representado_id' => null],
        ]);
    }

    public function test_validarDireitoRepresentacao_aceita_quando_representado_informado(): void
    {
        $this->expectNotToPerformAssertions();
        $this->service->validarDireitoRepresentacao([
            ['direito_representacao' => true, 'herdeiro_representado_id' => 5],
        ]);
    }

    public function test_calcularOrdem_ordena_por_prioridade_e_depois_por_ordem_informada(): void
    {
        $herdeiros = [
            ['nome' => 'Irmão', 'parentesco' => Parentesco::Irmao, 'ordem' => 1],
            ['nome' => 'Cônjuge', 'parentesco' => Parentesco::Companheiro, 'ordem' => 1],
            ['nome' => 'Filho 2', 'parentesco' => Parentesco::Filho, 'ordem' => 2],
            ['nome' => 'Filho 1', 'parentesco' => Parentesco::Filho, 'ordem' => 1],
        ];

        $resultado = $this->service->calcularOrdem($herdeiros);

        self::assertSame(
            ['Cônjuge', 'Filho 1', 'Filho 2', 'Irmão'],
            array_column($resultado, 'nome')
        );
        self::assertSame([1, 2, 3, 4], array_column($resultado, 'ordem'));
    }

    public function test_getOrdemPrioridade_retorna_padrao_quando_nao_informado(): void
    {
        $ordem = $this->service->getOrdemPrioridade();

        self::assertSame(Parentesco::Companheiro, $ordem[0]);
        self::assertContains(Parentesco::Outro, $ordem);
    }
}

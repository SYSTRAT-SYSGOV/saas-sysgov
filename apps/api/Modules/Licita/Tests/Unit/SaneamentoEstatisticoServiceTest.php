<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Unit;

use Modules\Licita\Services\SaneamentoEstatisticoService;
use PHPUnit\Framework\TestCase;

final class SaneamentoEstatisticoServiceTest extends TestCase
{
    public function test_amostra_homogenea_nao_remove_nenhum_valor(): void
    {
        $resultado = (new SaneamentoEstatisticoService())->sanear([100.0, 102.0, 98.0, 101.0, 99.0]);

        self::assertSame([], $resultado['outliers_removidos']);
        self::assertCount(5, $resultado['valores_saneados']);
        self::assertLessThan(25.0, $resultado['cv_percentual']);
    }

    public function test_remove_outlier_claro_ate_cv_ficar_abaixo_do_limiar(): void
    {
        $resultado = (new SaneamentoEstatisticoService())->sanear([100.0, 105.0, 98.0, 102.0, 5000.0]);

        self::assertContains(5000.0, $resultado['outliers_removidos']);
        self::assertNotContains(5000.0, $resultado['valores_saneados']);
        self::assertLessThan(25.0, $resultado['cv_percentual']);
    }

    public function test_nao_remove_abaixo_do_minimo_de_valores_restantes(): void
    {
        // Só 3 valores (mínimo do RN-006) — mesmo com dispersão alta, nada é removido.
        $resultado = (new SaneamentoEstatisticoService())->sanear([100.0, 100.0, 5000.0]);

        self::assertSame([], $resultado['outliers_removidos']);
        self::assertCount(3, $resultado['valores_saneados']);
    }

    public function test_ignora_valores_nao_positivos(): void
    {
        $resultado = (new SaneamentoEstatisticoService())->sanear([100.0, 0.0, -5.0, 102.0, 98.0]);

        self::assertCount(3, $resultado['valores_saneados']);
    }

    public function test_amostra_vazia_nao_gera_erro(): void
    {
        $resultado = (new SaneamentoEstatisticoService())->sanear([]);

        self::assertSame([], $resultado['valores_saneados']);
        self::assertSame(0.0, $resultado['media']);
        self::assertSame(0.0, $resultado['cv_percentual']);
    }
}

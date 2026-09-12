<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use Modules\Licita\Support\TextoParaHtml;
use Modules\Licita\Tests\TestCase;

final class TextoParaHtmlTest extends TestCase
{
    public function test_separa_paragrafos_por_linha_em_branco(): void
    {
        $html = TextoParaHtml::converter("Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro parágrafo.");

        self::assertSame('<p>Primeiro parágrafo.</p><p>Segundo parágrafo.</p><p>Terceiro parágrafo.</p>', $html);
    }

    public function test_converte_quebra_de_linha_isolada_dentro_do_paragrafo_em_br(): void
    {
        $html = TextoParaHtml::converter("Linha um.\nLinha dois.");

        self::assertSame("<p>Linha um.<br>\nLinha dois.</p>", $html);
    }

    public function test_escapa_caracteres_html_do_texto_da_ia(): void
    {
        $html = TextoParaHtml::converter('Texto com <script>alert(1)</script> & "aspas".');

        self::assertStringNotContainsString('<script>', $html);
        self::assertStringContainsString('&lt;script&gt;', $html);
        self::assertStringContainsString('&amp;', $html);
    }

    public function test_texto_vazio_gera_html_vazio(): void
    {
        self::assertSame('', TextoParaHtml::converter(''));
        self::assertSame('', TextoParaHtml::converter("   \n\n   "));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\HtmlSanitizer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class HtmlSanitizerTest extends TestCase
{
    /** @return iterable<string, array{string, string}> */
    public static function casos(): iterable
    {
        yield 'script some com o conteúdo' => ['<p>Olá</p><script>alert(1)</script>', '<p>Olá</p>'];
        yield 'style some com o conteúdo' => ['<style>p{color:red}</style><p>Olá</p>', '<p>Olá</p>'];
        yield 'iframe some' => ['<p>a</p><iframe src="https://evil.example"></iframe>', '<p>a</p>'];
        yield 'atributo de evento é removido' => ['<p onclick="x()">Olá</p>', '<p>Olá</p>'];
        yield 'href javascript é removido' => ['<a href="javascript:alert(1)">clique</a>', '<a>clique</a>'];
        yield 'tag desconhecida mantém o texto' => ['<blink>oi</blink>', 'oi'];
        yield 'formatação permitida é preservada' => ['<p><strong>negrito</strong> e <em>itálico</em></p>', '<p><strong>negrito</strong> e <em>itálico</em></p>'];
        yield 'vazio' => ['   ', ''];
    }

    #[DataProvider('casos')]
    public function test_sanitiza(string $entrada, string $esperado): void
    {
        $this->assertSame($esperado, (new HtmlSanitizer())->sanitize($entrada));
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Unit;

use Modules\Cursos\Support\VideoUrl;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class VideoUrlTest extends TestCase
{
    /** @return iterable<string, array{string, string, string}> */
    public static function aceitos(): iterable
    {
        yield 'youtube watch' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtube watch com outros parâmetros' => ['https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10s', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtube mobile' => ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtu.be' => ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtu.be com parâmetro' => ['https://youtu.be/dQw4w9WgXcQ?t=5', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtube embed' => ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'youtube shorts' => ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'http simples' => ['http://youtu.be/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'id com hífen e sublinhado' => ['https://youtu.be/a-b_c-d_e-f', 'youtube', 'a-b_c-d_e-f'];
        yield 'espaços nas pontas' => ['  https://youtu.be/dQw4w9WgXcQ  ', 'youtube', 'dQw4w9WgXcQ'];
        yield 'vimeo' => ['https://vimeo.com/76979871', 'vimeo', '76979871'];
        yield 'vimeo www' => ['https://www.vimeo.com/76979871', 'vimeo', '76979871'];
        yield 'vimeo player' => ['https://player.vimeo.com/video/76979871', 'vimeo', '76979871'];
        yield 'vimeo player com parâmetro' => ['https://player.vimeo.com/video/76979871?h=abc', 'vimeo', '76979871'];
    }

    #[DataProvider('aceitos')]
    public function test_aceita_os_formatos_suportados(string $url, string $provedor, string $id): void
    {
        $this->assertSame(['provedor' => $provedor, 'id' => $id], VideoUrl::parse($url));
    }

    /** @return iterable<string, array{string}> */
    public static function recusados(): iterable
    {
        yield 'outro provedor' => ['https://dailymotion.com/video/x7tgad0'];
        yield 'host parecido (sufixo)' => ['https://evilyoutube.com/watch?v=dQw4w9WgXcQ'];
        yield 'host parecido (subdomínio falso)' => ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'];
        yield 'youtube com credenciais' => ['https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ'];
        yield 'youtube com porta' => ['https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ'];
        yield 'esquema javascript' => ['javascript:alert(1)'];
        yield 'esquema ftp' => ['ftp://youtu.be/dQw4w9WgXcQ'];
        yield 'sem esquema' => ['youtu.be/dQw4w9WgXcQ'];
        yield 'id curto demais' => ['https://youtu.be/abc'];
        yield 'id com caractere inválido' => ['https://youtu.be/dQw4w9WgXc!'];
        yield 'id com tentativa de injeção' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ"onload="x'];
        yield 'watch sem v' => ['https://www.youtube.com/watch'];
        yield 'canal do youtube' => ['https://www.youtube.com/@canal'];
        yield 'playlist' => ['https://www.youtube.com/playlist?list=PL1234567890A'];
        yield 'vimeo sem id' => ['https://vimeo.com/'];
        yield 'vimeo com id não numérico' => ['https://vimeo.com/abc'];
        yield 'vimeo canal' => ['https://vimeo.com/channels/staffpicks/76979871'];
        yield 'vazio' => [''];
    }

    #[DataProvider('recusados')]
    public function test_recusa_enderecos_fora_da_lista(string $url): void
    {
        $this->assertNull(VideoUrl::parse($url));
    }

    public function test_monta_o_embed_a_partir_de_provedor_e_id(): void
    {
        $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', VideoUrl::embed('youtube', 'dQw4w9WgXcQ'));
        $this->assertSame('https://player.vimeo.com/video/76979871', VideoUrl::embed('vimeo', '76979871'));
    }

    public function test_embed_de_dados_invalidos_e_nulo(): void
    {
        $this->assertNull(VideoUrl::embed('youtube', 'curto'));
        $this->assertNull(VideoUrl::embed('vimeo', 'abc'));
        $this->assertNull(VideoUrl::embed('dailymotion', 'x7tgad0'));
    }
}

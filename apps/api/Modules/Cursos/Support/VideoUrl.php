<?php

declare(strict_types=1);

namespace Modules\Cursos\Support;

/**
 * Lista fechada de endereços de vídeo aceitos (design D4 da Fase 2). O
 * `src` do iframe é sempre montado a partir de provedor + ID validados,
 * nunca do texto informado, então não há como incorporar outro site.
 */
final class VideoUrl
{
    public const YOUTUBE = 'youtube';

    public const VIMEO = 'vimeo';

    private const HOSTS_YOUTUBE = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

    private const HOSTS_VIMEO = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

    private const ID_YOUTUBE = '/^[A-Za-z0-9_-]{11}$/';

    private const ID_VIMEO = '/^\d{1,12}$/';

    /**
     * @return array{provedor: string, id: string}|null nulo quando o endereço não é aceito
     */
    public static function parse(string $url): ?array
    {
        $partes = parse_url(trim($url));
        if ($partes === false || !in_array(strtolower($partes['scheme'] ?? ''), ['http', 'https'], true) || !isset($partes['host'])) {
            return null;
        }
        if (isset($partes['user']) || isset($partes['pass']) || isset($partes['port'])) {
            return null;
        }

        $host = strtolower($partes['host']);
        $caminho = $partes['path'] ?? '';

        if (in_array($host, self::HOSTS_YOUTUBE, true)) {
            $id = self::idYoutube($host, $caminho, $partes['query'] ?? '');

            return $id !== null ? ['provedor' => self::YOUTUBE, 'id' => $id] : null;
        }

        if (in_array($host, self::HOSTS_VIMEO, true)) {
            $id = self::idVimeo($host, $caminho);

            return $id !== null ? ['provedor' => self::VIMEO, 'id' => $id] : null;
        }

        return null;
    }

    public static function embed(string $provedor, string $id): ?string
    {
        return match (true) {
            $provedor === self::YOUTUBE && preg_match(self::ID_YOUTUBE, $id) === 1 => "https://www.youtube-nocookie.com/embed/{$id}",
            $provedor === self::VIMEO && preg_match(self::ID_VIMEO, $id) === 1 => "https://player.vimeo.com/video/{$id}",
            default => null,
        };
    }

    private static function idYoutube(string $host, string $caminho, string $query): ?string
    {
        if ($host === 'youtu.be') {
            $candidato = self::segmento($caminho, '#^/([^/]+)/?$#');
        } elseif ($caminho === '/watch') {
            parse_str($query, $parametros);
            $candidato = is_string($parametros['v'] ?? null) ? $parametros['v'] : null;
        } else {
            $candidato = self::segmento($caminho, '#^/(?:embed|shorts)/([^/]+)/?$#');
        }

        return $candidato !== null && preg_match(self::ID_YOUTUBE, $candidato) === 1 ? $candidato : null;
    }

    private static function idVimeo(string $host, string $caminho): ?string
    {
        $padrao = $host === 'player.vimeo.com' ? '#^/video/(\d+)/?$#' : '#^/(\d+)/?$#';
        $candidato = self::segmento($caminho, $padrao);

        return $candidato !== null && preg_match(self::ID_VIMEO, $candidato) === 1 ? $candidato : null;
    }

    private static function segmento(string $caminho, string $padrao): ?string
    {
        return preg_match($padrao, $caminho, $m) === 1 ? $m[1] : null;
    }
}

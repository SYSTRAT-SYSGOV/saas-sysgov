<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum TipoMaterial: string
{
    case Arquivo = 'arquivo';
    case Video = 'video';
    case Link = 'link';
    case Texto = 'texto';

    public function label(): string
    {
        return match ($this) {
            self::Arquivo => 'Arquivo PDF',
            self::Video => 'Vídeo',
            self::Link => 'Link externo',
            self::Texto => 'Texto',
        };
    }

    public function is(self ...$tipos): bool
    {
        return in_array($this, $tipos, true);
    }
}

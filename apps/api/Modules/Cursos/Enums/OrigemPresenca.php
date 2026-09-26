<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum OrigemPresenca: string
{
    case Manual = 'manual';
    case QrCode = 'qr_code';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Chamada manual',
            self::QrCode => 'Check-in por QR code',
        };
    }
}

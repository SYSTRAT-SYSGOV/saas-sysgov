<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final readonly class Money
{
    public function __construct(public int $cents, public string $currency = 'BRL')
    {
        if ($cents < 0) throw new InvalidArgumentException('Money não aceita valor negativo.');
    }
    public function toDecimal(): string { return number_format($this->cents / 100, 2, '.', ''); }
}

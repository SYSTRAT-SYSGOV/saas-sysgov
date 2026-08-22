<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\OutboxEvent;

final readonly class OutboxMessage
{
    public function __construct(public OutboxEvent $event) {}
}

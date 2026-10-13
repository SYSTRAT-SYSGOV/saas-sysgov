<?php

declare(strict_types=1);

namespace Modules\Ata\Exceptions;

use RuntimeException;

/** Assistente IA sem chave configurada: responde 503. */
final class IaIndisponivelException extends RuntimeException {}

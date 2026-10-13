<?php

declare(strict_types=1);

namespace Modules\Ata\Exceptions;

use DomainException;

/** Operação recusada pelo estado da ata (texto travado, assinatura repetida, ata finalizada): responde 409. */
final class AtaBloqueadaException extends DomainException {}

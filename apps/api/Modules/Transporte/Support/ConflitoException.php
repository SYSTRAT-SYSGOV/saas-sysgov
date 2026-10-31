<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

use DomainException;

/** Conflito com o estado atual (duplicidade, registro em uso): vira 409; as demais regras de negócio viram 422. */
final class ConflitoException extends DomainException {}

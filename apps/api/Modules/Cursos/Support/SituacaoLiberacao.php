<?php

declare(strict_types=1);

namespace Modules\Cursos\Support;

use Carbon\CarbonImmutable;

/**
 * Resultado da liberação de um item para uma turma. `preverEm` é a data
 * prevista exibida antes da liberação; fica nulo quando o item já está
 * liberado ou quando aguarda o agendamento da aula na turma.
 */
final readonly class SituacaoLiberacao
{
    public function __construct(
        public bool $liberado,
        public ?CarbonImmutable $preverEm,
        public bool $aguardandoAgendamento,
    ) {
    }

    public static function liberada(): self
    {
        return new self(true, null, false);
    }

    public static function agendada(CarbonImmutable $preverEm, CarbonImmutable $agora): self
    {
        return new self($agora->greaterThanOrEqualTo($preverEm), $agora->greaterThanOrEqualTo($preverEm) ? null : $preverEm, false);
    }

    public static function aguardandoAgendamento(): self
    {
        return new self(false, null, true);
    }
}

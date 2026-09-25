<?php

declare(strict_types=1);

namespace Modules\Cursos\Contracts;

use Modules\Cursos\Enums\RegraLiberacao;

/**
 * Item do curso (material ou avaliação) com liberação programada por turma.
 * Materiais e avaliações usam as mesmas colunas, então compartilham o cálculo.
 */
interface ComLiberacao
{
    public function regraLiberacao(): RegraLiberacao;

    /** N de "dias após o início da turma"; nulo nas demais regras. */
    public function diasLiberacao(): ?int;

    /** Aula vinculada, usada pela regra "no início da aula". */
    public function aulaLiberacaoId(): ?int;
}

<?php

namespace Modules\Capd\Contracts;

/** DTO — dados disciplinares (F2). */
final readonly class DisciplinaDados
{
    /**
     * Tipo de penalidade: 0=nenhuma, 1=advertência, 2=suspensão
     */
    public function __construct(
        public int $penalidades,          // Contagem de penalidades formais
        public int $tipoPenalidadeMaxima, // 0 | 1 | 2
        public int $grauCalculado,
        public string $notaCalculada,
        public ?string $observacao = null,
    ) {}
}

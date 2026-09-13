<?php

namespace Modules\Capd\Contracts;

/** DTO — dados de assiduidade e pontualidade (F1). */
final readonly class AssiduacaoDados
{
    public function __construct(
        public int $faltasInjustificadas,
        public int $atrasosTolerados,
        public int $atrasosInjustificados,
        /** Grau determinístico calculado conforme tabela spec §3.8 */
        public int $grauCalculado,
        /** Nota derivada = (grau - 1) × 2.5 */
        public string $notaCalculada,
        public ?string $observacao = null,
    ) {}
}

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

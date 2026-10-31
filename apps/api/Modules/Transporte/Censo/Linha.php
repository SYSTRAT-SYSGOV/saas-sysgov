<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo;

use Modules\Escola\Models\Aluno;
use Modules\Transporte\Models\Alocacao;

/** Uma linha do Registro 60: a alocação ativa com tudo que os campos precisam, já carregado. */
final readonly class Linha
{
    public function __construct(
        public Alocacao $alocacao,
        public Aluno $aluno,
        public ?string $escolaNome,
        public ?string $escolaInep,
        public int $anoLetivo,
    ) {}

    /**
     * Declaração anulada (design D26): sem atendimento curricular, mediação a distância ou residência fora do Brasil.
     */
    public function anulada(): bool
    {
        return !$this->alocacao->atendimento_curricular
            || $this->alocacao->mediacao_didatica === 'distancia'
            || strtoupper($this->alocacao->pais_residencia) !== 'BR';
    }

    public function tipologia(): ?int
    {
        return $this->alocacao->rota?->veiculo?->tipologia_inep;
    }
}

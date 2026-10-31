<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo;

use Closure;

/**
 * Campo do catálogo de um leiaute. `valor` recebe o contexto da linha e devolve o texto a exportar (ou `null` quando
 * não há dado). `obrigatorio` trava a seleção; `sensivel` exige confirmação e auditoria pelo nome; `confere` diz se o
 * campo pode sair no CSV de conferência (dado pessoal direto fica só no arquivo).
 */
final readonly class Campo
{
    /** @param Closure(Linha): (string|int|null) $valor */
    public function __construct(
        public string $chave,
        public string $rotulo,
        public string $grupo,
        public string $origem,
        public Closure $valor,
        public bool $obrigatorio = false,
        public bool $sensivel = false,
        public bool $confere = true,
    ) {}

    /** @return array{chave: string, rotulo: string, grupo: string, origem: string, obrigatorio: bool, sensivel: bool, confere: bool} */
    public function descrever(): array
    {
        return [
            'chave' => $this->chave, 'rotulo' => $this->rotulo, 'grupo' => $this->grupo, 'origem' => $this->origem,
            'obrigatorio' => $this->obrigatorio, 'sensivel' => $this->sensivel, 'confere' => $this->confere,
        ];
    }
}

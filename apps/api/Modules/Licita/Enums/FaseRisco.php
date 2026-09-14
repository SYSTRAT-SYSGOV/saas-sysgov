<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

/**
 * Em qual momento da contratação o risco pode se concretizar — categorias
 * usadas no Mapa de Riscos (art. 22 da Lei 14.133/2021), conforme o modelo
 * de referência já em uso pela prefeitura (fora do SYSGOV).
 */
enum FaseRisco: string
{
    case Planejamento = 'planejamento';
    case SelecaoFornecedor = 'selecao_fornecedor';
    case GestaoContratual = 'gestao_contratual';

    public function label(): string
    {
        return match ($this) {
            self::Planejamento => 'Planejamento',
            self::SelecaoFornecedor => 'Seleção de Fornecedor',
            self::GestaoContratual => 'Gestão Contratual',
        };
    }
}

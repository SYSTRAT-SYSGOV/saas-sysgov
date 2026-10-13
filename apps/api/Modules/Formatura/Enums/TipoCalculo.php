<?php

declare(strict_types=1);

namespace Modules\Formatura\Enums;

/** por_pessoa: valor base × (1 + convidados incluídos + extras); fixo_mais_convidados: valor base + extras × valor por extra. */
enum TipoCalculo: string
{
    case PorPessoa = 'por_pessoa';
    case FixoMaisConvidados = 'fixo_mais_convidados';
}

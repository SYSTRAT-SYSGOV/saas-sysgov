<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** Estados do jazigo (RF-04). */
enum EstadoJazigo: string
{
    case Disponivel = 'disponivel';
    case Concedido = 'concedido';
    case Ocupado = 'ocupado';
    case CapacidadeMaxima = 'capacidade_maxima';
    case Manutencao = 'manutencao';
}

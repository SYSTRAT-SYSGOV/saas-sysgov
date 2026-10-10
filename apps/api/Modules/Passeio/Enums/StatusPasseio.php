<?php

declare(strict_types=1);

namespace Modules\Passeio\Enums;

/** Passeio concluído ou cancelado não aceita novas inscrições. */
enum StatusPasseio: string
{
    case Agendado = 'agendado';
    case EmAndamento = 'em_andamento';
    case Concluido = 'concluido';
    case Cancelado = 'cancelado';

    public function aceitaInscricoes(): bool
    {
        return $this === self::Agendado || $this === self::EmAndamento;
    }
}

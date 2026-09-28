<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum StatusTentativa: string
{
    case EmAndamento = 'em_andamento';
    case AguardandoCorrecao = 'aguardando_correcao';
    case Corrigida = 'corrigida';

    public function label(): string
    {
        return match ($this) {
            self::EmAndamento => 'Em andamento',
            self::AguardandoCorrecao => 'Aguardando correção',
            self::Corrigida => 'Corrigida',
        };
    }

    public function is(self ...$status): bool
    {
        return in_array($this, $status, true);
    }
}

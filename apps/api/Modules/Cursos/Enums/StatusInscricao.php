<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum StatusInscricao: string
{
    case Pendente = 'pendente';
    case Confirmada = 'confirmada';
    case ListaEspera = 'lista_espera';
    case Cancelada = 'cancelada';
    case Concluida = 'concluida';
    case NaoConcluida = 'nao_concluida';

    public function label(): string
    {
        return match ($this) {
            self::Pendente => 'Pendente',
            self::Confirmada => 'Confirmada',
            self::ListaEspera => 'Lista de espera',
            self::Cancelada => 'Cancelada',
            self::Concluida => 'Concluída',
            self::NaoConcluida => 'Não concluída',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }

    /** Inscrição que ainda conta como "uma por turma" (spec: inscrição ativa). */
    public function ativa(): bool
    {
        return $this->is(self::Pendente, self::Confirmada, self::ListaEspera);
    }

    /** Inscrição que ocupa vaga na turma (spec: pendente e confirmada). */
    public function ocupaVaga(): bool
    {
        return $this->is(self::Pendente, self::Confirmada);
    }

    /** @return list<string> */
    public static function valoresQueOcupamVaga(): array
    {
        return [self::Pendente->value, self::Confirmada->value];
    }

    /** @return list<string> */
    public static function valoresAtivos(): array
    {
        return [self::Pendente->value, self::Confirmada->value, self::ListaEspera->value];
    }

    /**
     * pendente -> confirmada|cancelada
     * lista_espera -> confirmada|pendente (promoção) | cancelada
     * confirmada -> cancelada | concluida|nao_concluida (encerramento da turma)
     * cancelada, concluida e nao_concluida são terminais.
     */
    public function podeTransicionarPara(self $novo): bool
    {
        return match ($this) {
            self::Pendente => $novo->is(self::Confirmada, self::Cancelada),
            self::ListaEspera => $novo->is(self::Confirmada, self::Pendente, self::Cancelada),
            self::Confirmada => $novo->is(self::Cancelada, self::Concluida, self::NaoConcluida),
            self::Cancelada, self::Concluida, self::NaoConcluida => false,
        };
    }
}

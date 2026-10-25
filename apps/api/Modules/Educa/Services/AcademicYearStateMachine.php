<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicYear;

/**
 * Máquina de Estados Estrita do Ano Letivo (LDB e Regras de Governança).
 *
 * Transições válidas:
 * - start:            planning -> active
 * - freeze:           active -> frozen
 * - resume:           frozen -> active
 * - begin_evaluation: active -> evaluation_phase
 * - close:            evaluation_phase -> closed
 */
final class AcademicYearStateMachine
{
    public const STATUS_PLANNING = 'planning';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_FROZEN = 'frozen';
    public const STATUS_EVALUATION_PHASE = 'evaluation_phase';
    public const STATUS_CLOSED = 'closed';

    public const EVENT_START = 'start';
    public const EVENT_FREEZE = 'freeze';
    public const EVENT_RESUME = 'resume';
    public const EVENT_BEGIN_EVALUATION = 'begin_evaluation';
    public const EVENT_CLOSE = 'close';

    /**
     * @var array<string, array<string, string>>
     */
    private const TRANSITIONS = [
        self::STATUS_PLANNING => [
            self::EVENT_START => self::STATUS_ACTIVE,
        ],
        self::STATUS_ACTIVE => [
            self::EVENT_FREEZE => self::STATUS_FROZEN,
            self::EVENT_BEGIN_EVALUATION => self::STATUS_EVALUATION_PHASE,
        ],
        self::STATUS_FROZEN => [
            self::EVENT_RESUME => self::STATUS_ACTIVE,
        ],
        self::STATUS_EVALUATION_PHASE => [
            self::EVENT_CLOSE => self::STATUS_CLOSED,
        ],
        self::STATUS_CLOSED => [],
    ];

    /**
     * Valida se a transição é permitida a partir do estado atual.
     */
    public function canTransition(EducaAcademicYear $year, string $event): bool
    {
        if ($year->is_immutable) {
            return false;
        }

        $currentStatus = $year->status;

        return isset(self::TRANSITIONS[$currentStatus][$event]);
    }

    /**
     * Retorna o próximo status para o evento informado.
     *
     * @throws LogicException caso a transição seja inválida
     */
    public function getNextStatus(EducaAcademicYear $year, string $event): string
    {
        if ($year->is_immutable) {
            throw new LogicException('O ano letivo está encerrado e imutável.');
        }

        $currentStatus = $year->status;

        if (!isset(self::TRANSITIONS[$currentStatus][$event])) {
            throw new LogicException("Transição inválida: evento '{$event}' não é permitido para o status atual '{$currentStatus}'.");
        }

        return self::TRANSITIONS[$currentStatus][$event];
    }
}

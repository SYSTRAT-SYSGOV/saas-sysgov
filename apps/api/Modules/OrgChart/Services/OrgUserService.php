<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

final readonly class OrgUserService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox
    ) {}

    /**
     * Vincula um usuário a uma unidade organizacional com validação de unicidade de unidade primária (RN-ORG-007).
     *
     * @param array{
     *   role?: string,
     *   is_primary?: boolean,
     *   valid_from?: string|null,
     *   valid_to?: string|null,
     *   metadata?: array|null
     * } $attributes
     */
    public function linkUser(OrgUnit $unit, int $userId, array $attributes = []): OrgUnitUser
    {
        return DB::transaction(function () use ($unit, $userId, $attributes): OrgUnitUser {
            $user = User::find($userId);
            if ($user === null) {
                throw new InvalidArgumentException("Usuário #{$userId} não encontrado.");
            }

            $isPrimary = $attributes['is_primary'] ?? false;

            // RN-ORG-007: Se for unidade primária, desmarca outros vínculos primários do usuário neste tenant
            if ($isPrimary) {
                OrgUnitUser::query()
                    ->where('user_id', $userId)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            /** @var OrgUnitUser $link */
            $link = OrgUnitUser::updateOrCreate(
                [
                    'org_unit_id' => $unit->id,
                    'user_id' => $userId,
                ],
                [
                    'role' => $attributes['role'] ?? 'membro',
                    'is_primary' => $isPrimary,
                    'valid_from' => $attributes['valid_from'] ?? null,
                    'valid_to' => $attributes['valid_to'] ?? null,
                    'metadata' => $attributes['metadata'] ?? null,
                ]
            );

            $this->audit->record(
                'org',
                'user.linked',
                "OrgUnit #{$unit->id} -> User #{$userId} ({$link->role})",
                null,
                $link->toArray()
            );

            $this->outbox->publish(
                'OrgUnitUserLinked',
                [
                    'org_unit_id' => $unit->id,
                    'user_id' => $userId,
                    'role' => $link->role,
                    'is_primary' => $link->is_primary,
                ]
            );

            return $link;
        });
    }

    /**
     * Remove o vínculo de um usuário com uma unidade organizacional.
     */
    public function unlinkUser(OrgUnit $unit, int $userId): bool
    {
        return DB::transaction(function () use ($unit, $userId): bool {
            $link = OrgUnitUser::query()
                ->where('org_unit_id', $unit->id)
                ->where('user_id', $userId)
                ->first();

            if ($link === null) {
                return false;
            }

            $before = $link->toArray();
            $link->delete();

            $this->audit->record(
                'org',
                'user.unlinked',
                "OrgUnit #{$unit->id} -> User #{$userId}",
                $before,
                null
            );

            $this->outbox->publish(
                'OrgUnitUserUnlinked',
                [
                    'org_unit_id' => $unit->id,
                    'user_id' => $userId,
                ]
            );

            return true;
        });
    }

    /**
     * Define uma unidade como primária para o usuário no tenant.
     */
    public function setPrimaryUnit(int $userId, int $orgUnitId): OrgUnitUser
    {
        return DB::transaction(function () use ($userId, $orgUnitId): OrgUnitUser {
            $link = OrgUnitUser::query()
                ->where('org_unit_id', $orgUnitId)
                ->where('user_id', $userId)
                ->first();

            if ($link === null) {
                throw new InvalidArgumentException("O usuário #{$userId} não possui vínculo com a unidade #{$orgUnitId}.");
            }

            OrgUnitUser::query()
                ->where('user_id', $userId)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);

            $link->update(['is_primary' => true]);

            return $link->fresh();
        });
    }
}

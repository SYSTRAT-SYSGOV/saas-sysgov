<?php

declare(strict_types=1);

namespace Modules\OrgChart\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $org_unit_id
 * @property int $user_id
 * @property string $role
 * @property bool $is_primary
 * @property string|null $valid_from
 * @property string|null $valid_to
 * @property array|null $metadata
 */
final class OrgUnitUser extends Model
{
    use TenantAware;

    protected $table = 'org_unit_user';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'user_id',
        'role',
        'is_primary',
        'valid_from',
        'valid_to',
        'metadata',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'user_id' => 'integer',
        'is_primary' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
        'metadata' => 'array',
    ];

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeResponsibles(Builder $query): void
    {
        $query->where('role', 'responsavel');
    }

    public function scopeMembers(Builder $query): void
    {
        $query->where('role', 'membro');
    }

    public function scopePrimary(Builder $query): void
    {
        $query->where('is_primary', true);
    }
}

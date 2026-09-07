<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $name
 * @property string $slug
 * @property string|null $icon
 * @property int $order
 * @property bool $is_active
 * @property int|null $tenant_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, MenuItem> $items
 * @property-read Tenant|null $tenant
 */
final class MenuGroup extends Model
{
    protected $table = 'menu_groups';

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'icon',
        'order',
        'is_active',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'menu_group_id')->orderBy('order');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getName(): string
    {
        return $this->attributes['name'] ?? '';
    }

    public function getSlug(): string
    {
        return $this->attributes['slug'] ?? '';
    }

    public static function forTenant(?int $tenantId): \Illuminate\Database\Eloquent\Collection
    {
        return self::query()
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $q->orWhere('tenant_id', $tenantId);
                }
            })
            ->where('is_active', true)
            ->orderBy('order')
            ->with(['items' => fn ($q) => $q->where('is_active', true)->orderBy('order')])
            ->get();
    }
}
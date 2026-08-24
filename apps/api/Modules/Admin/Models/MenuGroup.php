<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

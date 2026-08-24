<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class MenuItem extends Model
{
    protected $table = 'menu_items';

    protected $fillable = [
        'tenant_id',
        'menu_group_id',
        'label',
        'icon',
        'route',
        'permission',
        'shortcut',
        'module_alias',
        'order',
        'is_active',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'menu_group_id' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(MenuGroup::class, 'menu_group_id');
    }
}

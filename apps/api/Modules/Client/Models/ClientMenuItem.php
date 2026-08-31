<?php

declare(strict_types=1);

namespace Modules\Client\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $menu_group_id
 * @property string $label
 * @property string|null $icon
 * @property string $route
 * @property string|null $permission
 * @property string|null $shortcut
 * @property string|null $module_alias
 * @property int $order
 * @property bool $is_active
 * @property-read ClientMenuGroup|null $group
 */
final class ClientMenuItem extends Model
{
    protected $table = 'client_menu_items';

    protected $fillable = [
        'menu_group_id', 'label', 'icon', 'route', 'permission', 'shortcut', 'module_alias', 'order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
        'order' => 'int',
    ];

    /** @return BelongsTo<ClientMenuGroup, $this> */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ClientMenuGroup::class, 'menu_group_id');
    }
}

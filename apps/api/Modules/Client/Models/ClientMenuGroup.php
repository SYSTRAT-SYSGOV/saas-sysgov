<?php

declare(strict_types=1);

namespace Modules\Client\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property string $name
 * @property string $slug
 * @property string|null $icon
 * @property int $order
 * @property bool $is_active
 * @property-read \Illuminate\Database\Eloquent\Collection<int, ClientMenuItem> $items
 */
final class ClientMenuGroup extends Model
{
    protected $table = 'client_menu_groups';

    protected $fillable = [
        'tenant_id', 'name', 'slug', 'icon', 'order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'bool',
        'order' => 'int',
    ];

    /** @return HasMany<ClientMenuItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ClientMenuItem::class, 'menu_group_id')->orderBy('order');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\Tenant;

final class Module extends Model
{
    protected $table = 'modules';
    protected $fillable = ['name', 'alias', 'metadata', 'enabled'];
    protected $casts = ['metadata' => 'array', 'enabled' => 'boolean'];
    public function tenants(): BelongsToMany { return $this->belongsToMany(Tenant::class, 'tenant_module')->withPivot(['enabled', 'settings']); }
}
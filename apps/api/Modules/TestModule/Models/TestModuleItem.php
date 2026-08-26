<?php

declare(strict_types=1);

namespace Modules\TestModule\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class TestModuleItem extends Model
{
    use TenantAware;

    protected $table = 'testmodule_items';

    protected $fillable = [
        'tenant_id',
        'code',
        'title',
        'amount_cents',
        'status',
        'metadata',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'amount_cents' => 'integer',
        'metadata' => 'array',
    ];
}
<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class CapdItem extends Model
{
    use TenantAware;

    protected $table = 'capd_items';

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
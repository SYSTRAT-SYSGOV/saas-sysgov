<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class RequerimentosItem extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_items';

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
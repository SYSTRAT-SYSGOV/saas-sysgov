<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SaasInvoice extends Model
{
    use TenantAware;

    protected $table = 'saas_invoices';

    protected $fillable = [
        'tenant_id',
        'saas_contract_id',
        'number',
        'reference_month',
        'amount_cents',
        'status',
        'issued_at',
        'due_at',
        'paid_at',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'saas_contract_id' => 'integer',
        'amount_cents' => 'integer',
        'reference_month' => 'date',
        'issued_at' => 'date',
        'due_at' => 'date',
        'paid_at' => 'date',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SaasContract::class, 'saas_contract_id');
    }
}

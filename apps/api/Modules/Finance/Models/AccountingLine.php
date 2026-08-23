<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class AccountingLine extends Model
{
    use TenantAware;

    protected $table = 'accounting_lines';

    protected $fillable = [
        'tenant_id',
        'entry_id',
        'account_id',
        'type',
        'amount_cents',
        'memo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'entry_id' => 'integer',
        'account_id' => 'integer',
        'amount_cents' => 'integer',
    ];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(AccountingEntry::class, 'entry_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class AccountingEntry extends Model
{
    use TenantAware;

    protected $table = 'accounting_entries';

    protected $fillable = [
        'tenant_id',
        'entry_number',
        'entry_date',
        'description',
        'document_ref',
        'total_amount_cents',
        'status',
        'created_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'entry_date' => 'date',
        'total_amount_cents' => 'integer',
        'created_by' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(AccountingLine::class, 'entry_id');
    }
}

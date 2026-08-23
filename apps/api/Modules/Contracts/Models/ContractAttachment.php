<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ContractAttachment extends Model
{
    use TenantAware;

    protected $table = 'contract_attachments';

    protected $fillable = [
        'tenant_id',
        'contract_id',
        'name',
        'storage_key',
        'mime_type',
        'size_bytes',
        'uploaded_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contract_id' => 'integer',
        'size_bytes' => 'integer',
        'uploaded_by' => 'integer',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class, 'contract_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

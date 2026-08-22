<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class ContractAttachment extends Model
{
    use TenantAware;
    protected $fillable = ['contract_id', 'name', 'storage_key', 'mime_type', 'size_bytes', 'uploaded_by'];
    protected $casts = ['size_bytes' => 'integer'];
}

<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $concession_id
 * @property string $tipo // termo|escritura|inventario|procuracao|outro
 * @property string $arquivo // caminho no storage
 * @property string $hash // SHA-256
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ConcessionDocumento extends Model
{
    use TenantAware;

    protected $table = 'concession_documentos';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        // The 'tipo' field is already a string, no cast needed.
        // The 'hash' is a string.
        // Timestamps are automatically cast to Carbon.
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }
}
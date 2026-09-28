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
 * @property string $de_estado
 * @property string $para_estado
 * @property string $motivo
 * @property int $usuario_id
 * @property string|null $processo_referencia
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ConcessionHistorico extends Model
{
    use TenantAware;

    protected $table = 'concession_historico';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        // No additional casts needed for string fields
        // Timestamps are automatically cast to Carbon by Eloquent
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }
}
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
 * @property string $nome
 * @property string $parentesco
 * @property string $documento
 * @property bool $titular_indicado
 * @property int $ordem
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ConcessionHerdeiro extends Model
{
    use TenantAware;

    protected $table = 'concession_herdeiros';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'titular_indicado' => 'boolean',
        'ordem' => 'integer',
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }
}
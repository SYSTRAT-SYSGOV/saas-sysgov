<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Inscrição (participação) de uma entidade num lote publicado.
 *
 * @property int $id
 * @property int $entidade_id
 * @property int $lote_id
 */
final class Interesse extends Model
{
    use TenantAware;

    protected $table = 'inservivel_interesses';

    protected $fillable = ['tenant_id', 'entidade_id', 'lote_id', 'ip'];

    protected $casts = ['tenant_id' => 'integer', 'entidade_id' => 'integer', 'lote_id' => 'integer'];

    /** @return BelongsTo<Entidade, $this> */
    public function entidade(): BelongsTo
    {
        return $this->belongsTo(Entidade::class, 'entidade_id');
    }

    /** @return BelongsTo<Lote, $this> */
    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}

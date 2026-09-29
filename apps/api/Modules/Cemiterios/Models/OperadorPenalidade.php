<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $operator_id
 * @property string $tipo
 * @property \Illuminate\Support\Carbon $inicio
 * @property \Illuminate\Support\Carbon|null $fim
 * @property string $motivo
 * @property string|null $arquivo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class OperadorPenalidade extends Model
{
    use TenantAware;

    protected $table = 'cemetery_operator_penalties';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['inicio' => 'date', 'fim' => 'date'];

    /** @return BelongsTo<OperadorCemiterio, $this> */
    public function operador(): BelongsTo
    {
        return $this->belongsTo(OperadorCemiterio::class, 'operator_id');
    }

    public function estaVigente(): bool
    {
        if ($this->tipo === 'descredenciamento') {
            return true;
        }

        if (!$this->fim) {
            return $this->inicio->lessThanOrEqualTo(today());
        }

        return $this->inicio->lessThanOrEqualTo(today()) && $this->fim->greaterThanOrEqualTo(today());
    }
}

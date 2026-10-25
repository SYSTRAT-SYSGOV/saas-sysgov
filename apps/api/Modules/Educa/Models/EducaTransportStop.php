<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Ponto de parada sequencial da rota de transporte escolar.
 */
final class EducaTransportStop extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_transport_stops';

    protected $fillable = [
        'tenant_id',
        'route_id',
        'ordem',
        'nome',
        'referencia',
        'latitude',
        'longitude',
        'horario_estimado',
    ];

    protected $casts = [
        'ordem' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(EducaTransportRoute::class, 'route_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(EducaTransportStudentAllocation::class, 'stop_id');
    }
}

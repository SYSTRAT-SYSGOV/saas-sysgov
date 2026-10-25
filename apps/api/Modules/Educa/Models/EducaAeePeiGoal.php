<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Meta Pedagógica Específica do PEI.
 */
final class EducaAeePeiGoal extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_pei_goals';

    protected $fillable = [
        'tenant_id',
        'pei_id',
        'area_desenvolvimento',
        'objetivo',
        'estrategias',
        'recursos',
        'indicadores_sucesso',
        'prazo_previsto',
        'status',
        'avaliacao_resultado',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'prazo_previsto' => 'date',
    ];

    public function pei(): BelongsTo
    {
        return $this->belongsTo(EducaAeePei::class, 'pei_id');
    }
}

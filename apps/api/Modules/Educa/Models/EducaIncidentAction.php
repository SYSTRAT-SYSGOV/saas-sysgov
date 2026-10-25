<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Ação, medida pedagógica ou convocação despachada em uma ocorrência.
 */
final class EducaIncidentAction extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_incident_actions';

    protected $fillable = [
        'tenant_id',
        'incident_id',
        'operador_user_id',
        'tipo_acao',
        'descricao',
        'exige_comparecimento',
        'data_acao',
    ];

    protected $casts = [
        'operador_user_id' => 'integer',
        'exige_comparecimento' => 'boolean',
        'data_acao' => 'date:Y-m-d',
    ];

    public function incident(): BelongsTo
    {
        return $this->belongsTo(EducaStudentIncident::class, 'incident_id');
    }

    public function operador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operador_user_id');
    }
}

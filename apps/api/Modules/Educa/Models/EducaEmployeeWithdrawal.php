<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Afastamento ou Licença Temporária do Servidor Escolar.
 */
final class EducaEmployeeWithdrawal extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_employee_withdrawals';

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'tipo_afastamento',
        'data_inicio',
        'data_fim',
        'motivo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_inicio' => 'date',
        'data_fim' => 'date',
    ];

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'employee_id');
    }
}

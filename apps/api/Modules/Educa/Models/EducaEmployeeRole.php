<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Função Profissional e Matrícula do Servidor Escolar.
 */
final class EducaEmployeeRole extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_employee_roles';

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'nome_funcao',
        'matricula',
        'is_docente',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'is_docente' => 'boolean',
    ];

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'employee_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class EducaConselhoPreConselhoAluno extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_pre_conselho_alunos';

    protected $fillable = [
        'tenant_id',
        'pre_conselho_id',
        'enrollment_id',
        'nivel_atencao',
        'motivo_atencao',
        'detalhes',
        'encaminhamentos',
    ];

    /**
     * @return BelongsTo<EducaConselhoPreConselho, $this>
     */
    public function preConselho(): BelongsTo
    {
        return $this->belongsTo(EducaConselhoPreConselho::class, 'pre_conselho_id');
    }

    /**
     * @return BelongsTo<EducaEnrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }
}

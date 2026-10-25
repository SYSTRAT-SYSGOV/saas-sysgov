<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class EducaConselhoDeliberacaoAluno extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_deliberacoes_alunos';

    protected $fillable = [
        'tenant_id',
        'ata_id',
        'enrollment_id',
        'resultado_deliberacao',
        'parecer_descritivo',
        'disciplinas_dependencia',
        'encaminhamento_pedagogico',
    ];

    protected function casts(): array
    {
        return [
            'disciplinas_dependencia' => 'array',
        ];
    }

    /**
     * @return BelongsTo<EducaConselhoAta, $this>
     */
    public function ata(): BelongsTo
    {
        return $this->belongsTo(EducaConselhoAta::class, 'ata_id');
    }

    /**
     * @return BelongsTo<EducaEnrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }
}

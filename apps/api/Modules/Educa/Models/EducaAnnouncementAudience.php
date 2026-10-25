<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Público-alvo segmentado de um comunicado escolar (Rede, Escola, Curso ou Turma).
 */
final class EducaAnnouncementAudience extends Model
{
    use HasUuids;
    use TenantAware;

    public const ALVO_REDE = 'rede';
    public const ALVO_ESCOLA = 'escola';
    public const ALVO_CURSO = 'curso';
    public const ALVO_TURMA = 'turma';

    protected $table = 'educa_announcement_audiences';

    protected $fillable = [
        'tenant_id',
        'announcement_id',
        'tipo_alvo',
        'target_id',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(EducaAnnouncement::class, 'announcement_id');
    }
}

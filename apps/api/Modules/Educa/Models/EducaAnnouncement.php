<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Comunicado ou aviso oficial escolar para murais e envio a responsáveis.
 */
final class EducaAnnouncement extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const URGENCIA_BAIXA = 'baixa';
    public const URGENCIA_MEDIA = 'media';
    public const URGENCIA_ALTA = 'alta';
    public const URGENCIA_URGENTE = 'urgente';

    public const STATUS_RASCUNHO = 'rascunho';
    public const STATUS_PUBLICADO = 'publicado';
    public const STATUS_ARQUIVADO = 'arquivado';

    protected $table = 'educa_announcements';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'autor_user_id',
        'titulo',
        'conteudo',
        'urgencia',
        'status',
        'data_publicacao',
        'data_expiracao',
        'total_leituras',
    ];

    protected $casts = [
        'data_publicacao' => 'date:Y-m-d',
        'data_expiracao' => 'date:Y-m-d',
        'total_leituras' => 'integer',
    ];

    public function audiences(): HasMany
    {
        return $this->hasMany(EducaAnnouncementAudience::class, 'announcement_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(EducaAnnouncementRead::class, 'announcement_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'autor_user_id');
    }
}

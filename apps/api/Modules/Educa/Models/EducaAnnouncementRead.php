<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Models\Pessoa;

/**
 * Registro individual de confirmação de leitura ou ciência de comunicado.
 */
final class EducaAnnouncementRead extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_announcement_reads';

    protected $fillable = [
        'tenant_id',
        'announcement_id',
        'user_id',
        'pessoa_id',
        'ip_address',
        'read_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'pessoa_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(EducaAnnouncement::class, 'announcement_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }
}

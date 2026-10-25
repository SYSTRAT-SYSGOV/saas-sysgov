<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

final class EducaConselhoMembro extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_membros';

    protected $fillable = [
        'tenant_id',
        'ata_id',
        'user_id',
        'cargo_funcao',
        'presente',
        'assinou_em',
    ];

    protected function casts(): array
    {
        return [
            'presente' => 'boolean',
            'assinou_em' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

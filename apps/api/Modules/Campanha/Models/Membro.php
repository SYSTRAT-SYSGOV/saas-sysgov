<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Usuário do tenant com acesso a uma campanha (D2).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int $user_id
 * @property-read User $user
 */
final class Membro extends Model
{
    use TenantAware;

    protected $table = 'campanha_membros';

    protected $fillable = ['tenant_id', 'campanha_id', 'user_id'];

    protected $casts = ['tenant_id' => 'integer', 'campanha_id' => 'integer', 'user_id' => 'integer'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

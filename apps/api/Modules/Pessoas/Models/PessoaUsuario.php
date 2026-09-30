<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property int $user_id
 * @property \Illuminate\Support\Carbon $promovido_em
 * @property int|null $promovido_por
 */
final class PessoaUsuario extends Model
{
    use TenantAware;

    protected $table = 'pessoas_usuarios';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'promovido_em' => 'datetime',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function promotor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'promovido_por');
    }
}

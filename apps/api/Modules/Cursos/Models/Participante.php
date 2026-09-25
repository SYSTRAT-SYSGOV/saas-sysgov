<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pessoa inscrita em cursos. Na Fase 1 é sempre um servidor com login
 * (user_id preenchido); user_id nulo fica reservado ao participante
 * externo da Fase 3 (design D2).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $user_id
 * @property string $nome
 * @property string $email
 * @property string|null $documento
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User|null $user
 */
final class Participante extends Model
{
    use TenantAware;

    protected $table = 'cursos_participantes';

    protected $fillable = ['tenant_id', 'user_id', 'nome', 'email', 'documento'];

    protected $casts = [
        'tenant_id' => 'integer',
        'user_id' => 'integer',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<Inscricao, $this> */
    public function inscricoes(): HasMany
    {
        return $this->hasMany(Inscricao::class, 'participante_id');
    }
}

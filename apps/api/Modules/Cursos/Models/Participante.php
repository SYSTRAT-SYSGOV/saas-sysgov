<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pessoa inscrita em cursos. `origem` distingue servidor (login já existente, o caso da Fase 1 e
 * anteriores) de externo (cadastro público da Fase 3, design D6); user_id nulo fica reservado a
 * um participante que nunca chegou a existir como usuário (não usado hoje).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $user_id
 * @property string $nome
 * @property string $email
 * @property string|null $documento
 * @property string $origem
 * @property \Illuminate\Support\Carbon|null $consentimento_em
 * @property int|null $termo_versao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User|null $user
 */
final class Participante extends Model
{
    use TenantAware;

    public const string ORIGEM_SERVIDOR = 'servidor';

    public const string ORIGEM_EXTERNO = 'externo';

    protected $table = 'cursos_participantes';

    protected $fillable = ['tenant_id', 'user_id', 'nome', 'email', 'documento', 'origem', 'consentimento_em', 'termo_versao'];

    protected $casts = [
        'tenant_id' => 'integer',
        'user_id' => 'integer',
        'consentimento_em' => 'datetime',
        'termo_versao' => 'integer',
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

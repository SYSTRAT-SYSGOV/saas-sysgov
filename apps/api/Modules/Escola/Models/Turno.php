<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property string $nome
 * @property int $ordem
 */
final class Turno extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_turnos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'nome', 'ordem'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'ordem' => 'integer'];

    /** @return HasMany<Turma, $this> */
    public function turmas(): HasMany
    {
        return $this->hasMany(Turma::class, 'turno_id');
    }
}

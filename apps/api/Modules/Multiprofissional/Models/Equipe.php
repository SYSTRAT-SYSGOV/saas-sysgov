<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Modules\Escola\Models\Escola;

/**
 * Equipe multiprofissional: profissionais e as escolas da rede que ela atende.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $turno
 * @property bool $ativo
 * @property \Illuminate\Database\Eloquent\Collection<int, Profissional> $profissionais
 * @property \Illuminate\Database\Eloquent\Collection<int, \Modules\Escola\Models\Escola> $escolas
 */
final class Equipe extends Model
{
    use TenantAware;

    protected $table = 'multi_equipes';

    protected $fillable = ['tenant_id', 'nome', 'turno', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];

    /** @return BelongsToMany<Profissional, $this> */
    public function profissionais(): BelongsToMany
    {
        return $this->belongsToMany(Profissional::class, 'multi_equipe_profissionais', 'equipe_id', 'profissional_id');
    }

    /** @return BelongsToMany<Escola, $this> */
    public function escolas(): BelongsToMany
    {
        return $this->belongsToMany(Escola::class, 'multi_equipe_escolas', 'equipe_id', 'escola_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $concession_id
 * @property string $numero_processo
 * @property string $tipo_documento
 * @property string|null $vara_ou_cartorio
 * @property string $situacao
 * @property string|null $despacho_fundamentacao
 * @property int|null $novo_titular_id
 * @property string|null $termo_numero
 * @property \Illuminate\Support\Carbon|null $deferido_em
 * @property int|null $deferido_por_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class ProcessoSucessao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_succession_processes';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'deferido_em' => 'datetime',
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }

    /** @return HasMany<HerdeiroSucessao, $this> */
    public function herdeiros(): HasMany
    {
        return $this->hasMany(HerdeiroSucessao::class, 'process_id');
    }

    /** @return BelongsTo<Concessionario, $this> */
    public function novoTitular(): BelongsTo
    {
        return $this->belongsTo(Concessionario::class, 'novo_titular_id');
    }

    /** @return BelongsTo<User, $this> */
    public function deferidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deferido_por_id');
    }
}

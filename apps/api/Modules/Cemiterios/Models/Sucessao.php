<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $concession_id
 * @property int|null $park_id
 * @property int|null $plot_id
 * @property ViaSucessao $via
 * @property EstadoSucessao $estado
 * @property int|null $requerente_id
 * @property int|null $titular_falecido_id
 * @property \Illuminate\Support\Carbon|null $data_falecimento
 * @property string|null $processo_referencia
 * @property string|null $parecer
 * @property int $lock_version
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Sucessao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'sucessoes';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'via' => ViaSucessao::class,
        'estado' => EstadoSucessao::class,
        'data_falecimento' => 'date',
        'lock_version' => 'integer',
    ];

    /** @return BelongsTo<Concessao, $this> */
    public function concessao(): BelongsTo
    {
        return $this->belongsTo(Concessao::class, 'concession_id');
    }

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return BelongsTo<Cemiterio, $this> */
    public function cemiterio(): BelongsTo
    {
        return $this->belongsTo(Cemiterio::class, 'park_id');
    }

    /** @return BelongsTo<User, $this> */
    public function requerente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requerente_id');
    }

    /** @return BelongsTo<Concessionario, $this> */
    public function titularFalecido(): BelongsTo
    {
        return $this->belongsTo(Concessionario::class, 'titular_falecido_id');
    }

    /** @return HasMany<SucessaoHerdeiro, $this> */
    public function herdeiros(): HasMany
    {
        return $this->hasMany(SucessaoHerdeiro::class, 'sucessao_id');
    }

    /** @return HasMany<SucessaoDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(SucessaoDocumento::class, 'sucessao_id');
    }

    /** @return HasMany<SucessaoHistorico, $this> */
    public function historico(): HasMany
    {
        return $this->hasMany(SucessaoHistorico::class, 'sucessao_id');
    }
}
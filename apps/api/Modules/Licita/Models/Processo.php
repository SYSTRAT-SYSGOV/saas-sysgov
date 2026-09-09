<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $numero
 * @property int $ano
 * @property string|null $objeto
 * @property string $fase_atual
 * @property string $status_geral
 * @property int|null $licitacao_id
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Dfd|null $dfd
 * @property-read User|null $criador
 */
final class Processo extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'licita_processos';

    protected $fillable = [
        'tenant_id',
        'numero',
        'ano',
        'objeto',
        'fase_atual',
        'status_geral',
        'licitacao_id',
        'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'licitacao_id' => 'integer',
        'criado_por' => 'integer',
    ];

    /**
     * @return HasOne<Dfd, $this>
     */
    public function dfd(): HasOne
    {
        return $this->hasOne(Dfd::class, 'processo_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }
}

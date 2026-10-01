<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $user_id
 * @property int|null $proposicao_id
 * @property string $evento
 * @property string $titulo
 * @property string $mensagem
 * @property string $canal
 * @property bool   $lida
 * @property string|null $lida_em
 * @property string|null $enviada_em
 */
final class Notificacao extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_notificacoes';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'proposicao_id',
        'evento',
        'titulo',
        'mensagem',
        'canal',
        'lida',
        'lida_em',
        'enviada_em',
    ];

    protected $casts = [
        'tenant_id'      => 'integer',
        'user_id'        => 'integer',
        'proposicao_id'  => 'integer',
        'lida'           => 'boolean',
        'lida_em'        => 'datetime',
        'enviada_em'     => 'datetime',
    ];

    /** @return BelongsTo<\App\Models\User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicao(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class);
    }

    public function scopeNaoLidas($query)
    {
        return $query->where('lida', false);
    }

    public function scopeDoUsuario($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
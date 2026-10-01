<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $proposicao_id
 * @property int    $user_id
 * @property string $tipo_autor
 * @property int    $ordem
 */
final class Autor extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_autores';

    protected $fillable = [
        'tenant_id',
        'proposicao_id',
        'user_id',
        'tipo_autor',
        'ordem',
    ];

    protected $casts = [
        'tenant_id'     => 'integer',
        'proposicao_id' => 'integer',
        'user_id'       => 'integer',
        'ordem'         => 'integer',
    ];

    public const TIPO_VEREADOR    = 'vereador';
    public const TIPO_COMISSAO    = 'comissao';
    public const TIPO_SECRETARIO  = 'secretario';
    public const TIPO_PREFEITO    = 'prefeito';

    /** @return BelongsTo<Proposicao, $this> */
    public function proposicao(): BelongsTo
    {
        return $this->belongsTo(Proposicao::class);
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }
}
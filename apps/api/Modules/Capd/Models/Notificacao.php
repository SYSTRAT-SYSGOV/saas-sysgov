<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Notificação disparada no fluxo do CAPD.
 */
final class Notificacao extends Model
{
    use TenantAware;

    protected $table = 'capd_notificacoes';

    protected $fillable = [
        'tenant_id',
        'destinatario_id',
        'canal',
        'tipo',
        'titulo',
        'corpo',
        'contexto',
        'lida',
        'lida_em',
        'enviada',
        'enviada_em',
    ];

    protected $casts = [
        'tenant_id'       => 'integer',
        'destinatario_id' => 'integer',
        'contexto'        => 'array',
        'lida'            => 'boolean',
        'lida_em'         => 'datetime',
        'enviada'         => 'boolean',
        'enviada_em'      => 'datetime',
    ];

    public const CANAL_EMAIL  = 'email';
    public const CANAL_IN_APP = 'in_app';

    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinatario_id');
    }
}

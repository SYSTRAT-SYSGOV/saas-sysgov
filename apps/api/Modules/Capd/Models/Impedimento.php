<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Impedimento de membro da comissão para julgar servidor específico (RN-C03).
 */
final class Impedimento extends Model
{
    use TenantAware;

    protected $table = 'capd_impedimentos';

    protected $fillable = [
        'tenant_id',
        'comissao_membro_id',
        'servidor_alvo_id',
        'tipo_impedimento',
        'motivo',
        'declarado_em',
        'declarado_por',
    ];

    protected $casts = [
        'tenant_id'          => 'integer',
        'comissao_membro_id' => 'integer',
        'servidor_alvo_id'   => 'integer',
        'declarado_por'      => 'integer',
        'declarado_em'       => 'datetime',
    ];

    public function membro(): BelongsTo
    {
        return $this->belongsTo(ComissaoMembro::class, 'comissao_membro_id');
    }

    public function servidorAlvo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'servidor_alvo_id');
    }

    public function declaradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declarado_por');
    }
}

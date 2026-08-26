<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoLance extends Model
{
    use TenantAware;

    protected $table = 'licitacao_lances';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'participante_id',
        'valor_cents',
        'ordem',
        'lancado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'participante_id' => 'integer',
        'valor_cents' => 'integer',
        'ordem' => 'integer',
        'lancado_em' => 'datetime',
    ];

    public function participante(): BelongsTo
    {
        return $this->belongsTo(LicitacaoParticipante::class);
    }
}

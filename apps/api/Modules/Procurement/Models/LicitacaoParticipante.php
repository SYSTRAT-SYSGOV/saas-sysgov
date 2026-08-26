<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoParticipante extends Model
{
    use TenantAware;

    protected $table = 'licitacao_participantes';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'razao_social',
        'cnpj',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class);
    }
}

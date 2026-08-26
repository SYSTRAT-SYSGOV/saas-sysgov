<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ProcurementArtefato extends Model
{
    use TenantAware;

    protected $table = 'procurement_artefatos';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'tipo',
        'status',
        'conteudo',
        'aprovado_por',
        'aprovado_em',
        'created_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
        'created_by' => 'integer',
        'conteudo' => 'array',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class);
    }

    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

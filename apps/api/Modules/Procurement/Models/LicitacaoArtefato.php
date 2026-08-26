<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoArtefato extends Model
{
    use TenantAware;

    protected $table = 'licitacao_artefatos';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'tipo',
        'status',
        'conteudo',
        'created_by',
        'aprovado_por',
        'aprovado_em',
        'justificativa_reprovacao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'conteudo' => 'array',
        'created_by' => 'integer',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class, 'licitacao_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoParecer extends Model
{
    use TenantAware;

    protected $table = 'licitacao_pareceres';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'parecerista_id',
        'aprovado_por',
        'tipo',
        'parecer',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'parecerista_id' => 'integer',
        'aprovado_por' => 'integer',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class);
    }

    public function parecerista(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parecerista_id');
    }

    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}
<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

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

    public function dfd(): HasOne
    {
        return $this->hasOne(Dfd::class, 'processo_id');
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }
}

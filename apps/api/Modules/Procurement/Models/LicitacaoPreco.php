<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class LicitacaoPreco extends Model
{
    use TenantAware;

    protected $table = 'licitacao_precos';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'tipo_fonte',
        'fornecedor',
        'valor_cents',
        'url_ref',
        'status',
        'motivo_outlier',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'valor_cents' => 'integer',
    ];
}

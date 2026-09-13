<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ServidorAfastamento extends Model
{
    use TenantAware;

    protected $table = 'capd_servidor_afastamentos';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'tipo_afastamento',
        'data_inicio',
        'data_fim',
        'dias_afastado',
        'suspende_avaliacao',
        'observacoes',
    ];

    protected $casts = [
        'tenant_id'          => 'integer',
        'servidor_id'        => 'integer',
        'data_inicio'        => 'date',
        'data_fim'           => 'date',
        'dias_afastado'      => 'integer',
        'suspende_avaliacao' => 'boolean',
    ];

    /** @return BelongsTo<Servidor, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }
}

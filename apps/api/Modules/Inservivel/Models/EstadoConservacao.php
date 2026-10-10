<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/** Estado de conservação do bem (parâmetro). */
final class EstadoConservacao extends Model
{
    use TenantAware;

    protected $table = 'inservivel_estados_conservacao';

    protected $fillable = ['tenant_id', 'nome', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/** Categoria de bem (parâmetro). */
final class Categoria extends Model
{
    use TenantAware;

    protected $table = 'inservivel_categorias';

    protected $fillable = ['tenant_id', 'nome', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Tipo de atendimento (avaliação, orientação à família...).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property bool $ativo
 */
final class TipoAtendimento extends Model
{
    use TenantAware;

    protected $table = 'multi_tipos_atendimento';

    protected $fillable = ['tenant_id', 'nome', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

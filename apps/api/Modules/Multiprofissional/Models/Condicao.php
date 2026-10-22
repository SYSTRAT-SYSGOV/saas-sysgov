<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Condição do estudante (deficiência, transtorno...) com o código CID — dado sensível (LGPD, art. 11).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $cid
 * @property bool $ativo
 * @property \Illuminate\Database\Eloquent\Relations\Pivot|null $pivot
 */
final class Condicao extends Model
{
    use TenantAware;

    protected $table = 'multi_condicoes';

    protected $fillable = ['tenant_id', 'nome', 'cid', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

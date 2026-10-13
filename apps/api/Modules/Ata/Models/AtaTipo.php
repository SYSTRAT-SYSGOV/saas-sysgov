<?php

declare(strict_types=1);

namespace Modules\Ata\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $nome
 * @property bool $ativo
 */
final class AtaTipo extends Model
{
    use TenantAware;

    protected $table = 'ata_tipos';

    protected $fillable = ['tenant_id', 'nome', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

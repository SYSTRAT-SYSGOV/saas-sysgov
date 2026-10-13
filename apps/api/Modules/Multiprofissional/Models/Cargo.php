<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Cargo/função do profissional (psicólogo, fonoaudiólogo...).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $objetivos
 * @property bool $ativo
 */
final class Cargo extends Model
{
    use TenantAware;

    protected $table = 'multi_cargos';

    protected $fillable = ['tenant_id', 'nome', 'objetivos', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean'];
}

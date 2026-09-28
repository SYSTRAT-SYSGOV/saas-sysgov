<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $holder_id
 * @property int|null $concession_id
 * @property string $tipo
 * @property string $mensagem
 * @property string $situacao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class SolicitacaoPortal extends Model
{
    use TenantAware;

    protected $table = 'cemetery_holder_requests';

    protected $guarded = ['id', 'tenant_id'];
}

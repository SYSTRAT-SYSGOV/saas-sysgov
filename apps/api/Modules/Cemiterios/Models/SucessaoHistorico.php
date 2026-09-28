<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $sucessao_id
 * @property string $de_estado
 * @property string $para_estado
 * @property array<string>|null $motivo
 * @property int $usuario_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class SucessaoHistorico extends Model
{
    use TenantAware;

    protected $table = 'sucessao_historico';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'motivo' => 'array',
    ];

    /** @return BelongsTo<Sucessao, $this> */
    public function sucessao(): BelongsTo
    {
        return $this->belongsTo(Sucessao::class, 'sucessao_id');
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
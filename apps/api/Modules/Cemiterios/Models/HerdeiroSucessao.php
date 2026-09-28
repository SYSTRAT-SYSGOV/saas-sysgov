<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $process_id
 * @property string $nome
 * @property string $parentesco
 * @property string|null $documento
 * @property string|null $telefone
 * @property string|null $email
 * @property bool $titular_indicado
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class HerdeiroSucessao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_succession_heirs';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'titular_indicado' => 'boolean',
    ];

    /** @return BelongsTo<ProcessoSucessao, $this> */
    public function processo(): BelongsTo
    {
        return $this->belongsTo(ProcessoSucessao::class, 'process_id');
    }
}

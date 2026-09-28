<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $sucessao_id
 * @property TipoDocumentoSucessao $tipo
 * @property string $arquivo
 * @property string $hash
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class SucessaoDocumento extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'sucessao_documentos';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'tipo' => TipoDocumentoSucessao::class,
    ];

    /** @return BelongsTo<Sucessao, $this> */
    public function sucessao(): BelongsTo
    {
        return $this->belongsTo(Sucessao::class, 'sucessao_id');
    }
}
<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property string $entidade_tipo
 * @property int $entidade_id
 * @property string|null $papel_vinculo
 */
final class Vinculo extends Model
{
    use TenantAware;
    use HasFactory;

    protected $table = 'protocolo_vinculos';

    public const PAPEL_ORIGEM = 'origem';
    public const PAPEL_REFERENCIA = 'referencia';
    public const PAPEL_INTERESSADO = 'interessado';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'entidade_tipo',
        'entidade_id',
        'papel_vinculo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'entidade_id' => 'integer',
    ];

    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }
}

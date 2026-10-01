<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $anexavel_id
 * @property string $anexavel_type
 * @property string $nome_arquivo
 * @property string $url_armazenamento
 * @property string $hash_sha256
 * @property string $mime_type
 * @property int    $tamanho_bytes
 * @property int    $uploaded_by
 */
final class Anexo extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_anexos';

    protected $fillable = [
        'tenant_id',
        'anexavel_id',
        'anexavel_type',
        'nome_arquivo',
        'url_armazenamento',
        'hash_sha256',
        'mime_type',
        'tamanho_bytes',
        'uploaded_by',
    ];

    protected $casts = [
        'tenant_id'      => 'integer',
        'anexavel_id'    => 'integer',
        'tamanho_bytes'  => 'integer',
        'uploaded_by'    => 'integer',
    ];

    /** @return MorphTo */
    public function anexavel(): MorphTo
    {
        return $this->morphTo();
    }
}
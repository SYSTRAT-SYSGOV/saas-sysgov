<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Documento comprobatório de recurso administrativo com hash SHA-256.
 */
final class RecursoDocumento extends Model
{
    use TenantAware;

    protected $table = 'capd_recurso_documentos';

    protected $fillable = [
        'tenant_id',
        'recurso_id',
        'enviado_por',
        'nome_arquivo',
        'url_armazenamento',
        'hash_sha256',
        'mime_type',
        'tamanho_bytes',
    ];

    protected $casts = [
        'tenant_id'     => 'integer',
        'recurso_id'    => 'integer',
        'enviado_por'   => 'integer',
        'tamanho_bytes' => 'integer',
    ];

    public function recurso(): BelongsTo
    {
        return $this->belongsTo(Recurso::class, 'recurso_id');
    }

    public function enviadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enviado_por');
    }
}

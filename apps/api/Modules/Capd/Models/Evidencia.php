<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Evidência documental (PDF/PNG/JPG) vinculada a um incidente CIT. */
final class Evidencia extends Model
{
    use TenantAware;

    protected $table = 'capd_evidencias';

    protected $fillable = [
        'tenant_id', 'diario_bordo_id', 'nome_arquivo',
        'url_armazenamento', 'hash_sha256', 'mime_type', 'tamanho_bytes',
    ];

    protected $casts = [
        'tenant_id'       => 'integer',
        'diario_bordo_id' => 'integer',
        'tamanho_bytes'   => 'integer',
    ];

    public const MIME_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg'];

    public function diarioBordo(): BelongsTo
    {
        return $this->belongsTo(DiarioBordo::class, 'diario_bordo_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoDocumento extends Model
{
    use TenantAware;

    protected $table = 'licitacao_documentos';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'tipo',
        'titulo',
        'storage_path',
        'mime_type',
        'size_bytes',
        'uploaded_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'size_bytes' => 'integer',
        'uploaded_by' => 'integer',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class, 'licitacao_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

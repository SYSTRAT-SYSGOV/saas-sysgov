<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property string $tipo_documento
 * @property string $nome_arquivo
 * @property string $caminho_arquivo
 * @property string $hash_arquivo
 * @property int $tamanho_bytes
 * @property string|null $mime_type
 * @property int|null $criado_por
 */
final class Documento extends Model
{
    use TenantAware;
    use HasFactory;
    use SoftDeletes;

    protected $table = 'protocolo_documentos';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'tipo_documento',
        'nome_arquivo',
        'caminho_arquivo',
        'hash_arquivo',
        'tamanho_bytes',
        'mime_type',
        'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'tamanho_bytes' => 'integer',
        'criado_por' => 'integer',
    ];

    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }
}

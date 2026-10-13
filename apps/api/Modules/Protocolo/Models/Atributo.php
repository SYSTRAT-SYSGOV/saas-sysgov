<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property string $chave
 * @property mixed $valor
 * @property string $tipo_atributo
 * @property int|null $criado_por
 */
final class Atributo extends Model
{
    use TenantAware;
    use HasFactory;

    protected $table = 'protocolo_atributos';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'chave',
        'valor',
        'tipo_atributo',
        'criado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'valor' => 'json',
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

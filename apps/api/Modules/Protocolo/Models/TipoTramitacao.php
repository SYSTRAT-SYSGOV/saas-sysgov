<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $slug
 * @property string $nome
 * @property string|null $descricao
 * @property bool $ativo
 * @property int|null $prazo_dias
 * @property string|null $efeito_status
 */
final class TipoTramitacao extends Model
{
    use TenantAware;
    use HasFactory;
    use SoftDeletes;

    protected $table = 'protocolo_tipos_tramitacao';

    protected $fillable = [
        'tenant_id',
        'slug',
        'nome',
        'descricao',
        'ativo',
        'prazo_dias',
        'efeito_status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo' => 'boolean',
        'prazo_dias' => 'integer',
    ];

    public function andamentos(): HasMany
    {
        return $this->hasMany(Andamento::class, 'tipo_tramitacao_id');
    }
}

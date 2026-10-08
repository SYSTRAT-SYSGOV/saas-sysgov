<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Credencial de integração M2M (seção 14.3) — um token de API dedicado, mapeado direto a
 * um tenant, usado por sistemas externos pra consultar `GET /api/vistoria/autuacoes` sem
 * passar pelo fluxo de login humano (`auth:sanctum`/`resolve.tenant`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $api_key
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $ultimo_uso_em
 */
final class VistoriaIntegracao extends Model
{
    use TenantAware;

    protected $table = 'vistoria_integracoes';

    protected $fillable = [
        'tenant_id',
        'nome',
        'api_key',
        'is_active',
        'ultimo_uso_em',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'is_active' => 'boolean',
        'ultimo_uso_em' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->api_key)) {
                $model->api_key = 'vst_' . Str::random(40);
            }
        });
    }

    /** @return BelongsTo<Tenant, $this> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}

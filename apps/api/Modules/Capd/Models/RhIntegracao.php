<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

final class RhIntegracao extends Model
{
    use TenantAware;

    protected $table = 'capd_rh_integracoes';

    protected $fillable = [
        'tenant_id',
        'nome',
        'driver',
        'api_key',
        'api_url',
        'api_token',
        'webhook_url',
        'webhook_secret',
        'field_mappings',
        'is_active',
        'ultima_sincronizacao_em',
    ];

    protected $casts = [
        'tenant_id'               => 'integer',
        'field_mappings'          => 'array',
        'is_active'               => 'boolean',
        'ultima_sincronizacao_em' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->api_key)) {
                $model->api_key = 'rh_' . Str::random(40);
            }
            if (empty($model->webhook_secret)) {
                $model->webhook_secret = 'whsec_' . Str::random(32);
            }
        });
    }

    /** @return HasMany<RhSyncLog, $this> */
    public function logs(): HasMany
    {
        return $this->hasMany(RhSyncLog::class, 'integracao_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registro de execução de vistoria coletado em campo (offline-first), sincronizado
 * a partir do dispositivo via `client_uuid` usado como chave de idempotência.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $ordem_servico_id
 * @property int $fiscal_id
 * @property string $client_uuid
 * @property string $status
 * @property array<string, mixed>|null $dados
 * @property \Illuminate\Support\Carbon|null $iniciado_em_dispositivo
 * @property \Illuminate\Support\Carbon|null $concluido_em_dispositivo
 * @property \Illuminate\Support\Carbon|null $sincronizado_em
 */
final class ExecucaoVistoria extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_execucoes';

    public const STATUS_PENDENTE_SINCRONIZACAO = 'pendente_sincronizacao';
    public const STATUS_SINCRONIZADA = 'sincronizada';
    public const STATUS_SUPLEMENTAR = 'suplementar';

    protected $fillable = [
        'tenant_id',
        'ordem_servico_id',
        'fiscal_id',
        'client_uuid',
        'status',
        'dados',
        'iniciado_em_dispositivo',
        'concluido_em_dispositivo',
        'sincronizado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ordem_servico_id' => 'integer',
        'fiscal_id' => 'integer',
        'dados' => 'array',
        'iniciado_em_dispositivo' => 'datetime',
        'concluido_em_dispositivo' => 'datetime',
        'sincronizado_em' => 'datetime',
    ];

    /** @return BelongsTo<OrdemServico, $this> */
    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /** @return BelongsTo<User, $this> */
    public function fiscal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fiscal_id');
    }
}

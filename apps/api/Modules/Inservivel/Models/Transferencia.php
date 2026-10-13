<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Inservivel\Enums\StatusTransferencia;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Transferência interna de bem entre secretarias (D11).
 *
 * @property int $id
 * @property int $bem_id
 * @property int $secretaria_origem_unit_id
 * @property int|null $secretaria_destino_unit_id
 * @property StatusTransferencia $status
 * @property int|null $situacao_anterior_id
 * @property int|null $anunciado_por
 * @property Carbon|null $data_conclusao
 * @property-read Bem $bem
 * @property-read OrgUnit $origem
 * @property-read OrgUnit|null $destino
 * @property-read User|null $anunciante
 * @property-read User|null $solicitante
 * @property-read User|null $aprovador
 */
final class Transferencia extends Model
{
    use TenantAware;

    protected $table = 'inservivel_transferencias';

    protected $fillable = [
        'tenant_id', 'bem_id', 'secretaria_origem_unit_id', 'secretaria_destino_unit_id', 'status', 'situacao_anterior_id', 'observacao',
        'motivo_recusa', 'anunciado_por', 'solicitado_por', 'decidido_por', 'data_solicitacao', 'data_conclusao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'bem_id' => 'integer',
        'secretaria_origem_unit_id' => 'integer',
        'secretaria_destino_unit_id' => 'integer',
        'situacao_anterior_id' => 'integer',
        'anunciado_por' => 'integer',
        'solicitado_por' => 'integer',
        'decidido_por' => 'integer',
        'status' => StatusTransferencia::class,
        'data_solicitacao' => 'datetime',
        'data_conclusao' => 'datetime',
    ];

    /** @return BelongsTo<Bem, $this> */
    public function bem(): BelongsTo
    {
        return $this->belongsTo(Bem::class, 'bem_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function origem(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'secretaria_origem_unit_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function destino(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'secretaria_destino_unit_id');
    }

    /** @return BelongsTo<User, $this> */
    public function anunciante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'anunciado_por');
    }

    /** @return BelongsTo<User, $this> */
    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitado_por');
    }

    /** @return BelongsTo<User, $this> */
    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decidido_por');
    }
}

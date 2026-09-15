<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Licita\Enums\StatusAprovacaoFinal;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property string $status
 * @property int|null $solicitado_por
 * @property \Illuminate\Support\Carbon|null $solicitado_em
 * @property int|null $aprovado_por
 * @property \Illuminate\Support\Carbon|null $aprovado_em
 * @property string|null $parecer
 * @property string|null $motivo_rejeicao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Processo $processo
 * @property-read User|null $solicitante
 * @property-read User|null $aprovador
 */
final class AprovacaoFinal extends Model
{
    use TenantAware;

    protected $table = 'licita_aprovacoes_finais';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'status',
        'solicitado_por',
        'solicitado_em',
        'aprovado_por',
        'aprovado_em',
        'parecer',
        'motivo_rejeicao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'solicitado_por' => 'integer',
        'solicitado_em' => 'datetime',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
    ];

    public function statusEnum(): StatusAprovacaoFinal
    {
        return StatusAprovacaoFinal::from($this->status);
    }

    /**
     * @return BelongsTo<Processo, $this>
     */
    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitado_por');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}

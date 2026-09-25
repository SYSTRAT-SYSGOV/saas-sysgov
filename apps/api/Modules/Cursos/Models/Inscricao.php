<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Modules\Cursos\Enums\StatusInscricao;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $turma_id
 * @property int $participante_id
 * @property string $status
 * @property int|null $inscrito_por
 * @property int|null $aprovada_por
 * @property \Illuminate\Support\Carbon|null $aprovada_em
 * @property int|null $cancelada_por
 * @property \Illuminate\Support\Carbon|null $cancelada_em
 * @property string|null $motivo_cancelamento
 * @property string|null $frequencia_apurada
 * @property \Illuminate\Support\Carbon|null $concluida_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Turma $turma
 * @property-read Participante $participante
 * @property-read Certificado|null $certificado
 */
final class Inscricao extends Model
{
    use TenantAware;

    protected $table = 'cursos_inscricoes';

    protected $fillable = [
        'tenant_id', 'turma_id', 'participante_id', 'status', 'inscrito_por', 'aprovada_por', 'aprovada_em',
        'cancelada_por', 'cancelada_em', 'motivo_cancelamento', 'frequencia_apurada', 'concluida_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'turma_id' => 'integer',
        'participante_id' => 'integer',
        'inscrito_por' => 'integer',
        'aprovada_por' => 'integer',
        'aprovada_em' => 'datetime',
        'cancelada_por' => 'integer',
        'cancelada_em' => 'datetime',
        'frequencia_apurada' => 'decimal:2',
        'concluida_em' => 'datetime',
    ];

    public function statusEnum(): StatusInscricao
    {
        return StatusInscricao::from($this->status);
    }

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    /** @return BelongsTo<Participante, $this> */
    public function participante(): BelongsTo
    {
        return $this->belongsTo(Participante::class, 'participante_id');
    }

    /** @return HasMany<Presenca, $this> */
    public function presencas(): HasMany
    {
        return $this->hasMany(Presenca::class, 'inscricao_id');
    }

    /** @return HasOne<Certificado, $this> */
    public function certificado(): HasOne
    {
        return $this->hasOne(Certificado::class, 'inscricao_id');
    }
}

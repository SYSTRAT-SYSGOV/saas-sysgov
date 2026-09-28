<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $numero
 * @property int $plot_id
 * @property int $holder_id
 * @property string $tipo // perpetua | temporaria
 * @property string $base_legal
 * @property string $estado // Solicitada, Ativa, Vencendo, Vencida, Caduca, Revertida, Sucedida, Transferida, Negada
 * @property \Illuminate\Support\Carbon $data_inicio
 * @property \Illuminate\Support\Carbon|null $data_fim
 * @property int|null $prazo_anos
 * @property int|null $taxa_manutencao_centavos
 * @property int|null $vigencia_manifestacao_dias
 * @property int $lock_version
 * @property \Illuminate\Support\Carbon|null $notificado_para_termino
 * @property bool $pendencia_regularizacao
 * @property bool $sujeita_taxa_anual
 * @property string|null $motivo_pendencia
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Concessao extends Model
{
    use TenantAware;
    use SoftDeletes;

    /** Estados em que a concessão segue vigente (jazigo permanece Concedido). */
    public const ESTADOS_VIGENTES = ['Ativa', 'Vencendo', 'Sucedida', 'Transferida'];

    /** Estados finais/extintivos: nenhum novo uso é admitido. */
    public const ESTADOS_EXTINTOS = ['Caduca', 'Revertida', 'Negada'];

    protected $table = 'concessions';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'prazo_anos' => 'integer',
        'taxa_manutencao_centavos' => 'integer',
        'vigencia_manifestacao_dias' => 'integer',
        'lock_version' => 'integer',
        'notificado_para_termino' => 'date',
        'pendencia_regularizacao' => 'boolean',
        'sujeita_taxa_anual' => 'boolean',
        'motivo_pendencia' => 'string',
    ];

    /** @return BelongsTo<Jazigo, $this> */
    public function jazigo(): BelongsTo
    {
        return $this->belongsTo(Jazigo::class, 'plot_id');
    }

    /** @return BelongsTo<Concessionario, $this> */
    public function concessionario(): BelongsTo
    {
        return $this->belongsTo(Concessionario::class, 'holder_id');
    }

    /** @return HasMany<ProcessoSucessao, $this> */
    public function processosSucessao(): HasMany
    {
        return $this->hasMany(ProcessoSucessao::class, 'concession_id');
    }

    /** @return HasMany<Guia, $this> */
    public function guias(): HasMany
    {
        return $this->hasMany(Guia::class, 'origem_id')->where('origem_type', 'concessao');
    }

    /** @return HasMany<ConcessionHerdeiro, $this> */
    public function herdeiros(): HasMany
    {
        return $this->hasMany(ConcessionHerdeiro::class, 'concession_id');
    }

    /** @return HasMany<ConcessionDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(ConcessionDocumento::class, 'concession_id');
    }

    /** @return HasMany<ConcessionHistorico, $this> */
    public function historico(): HasMany
    {
        return $this->hasMany(ConcessionHistorico::class, 'concession_id');
    }

    /**
     * Scope das concessões vigentes (ativas, vencendo, sucedidas ou transferidas).
     *
     * @param  EloquentBuilder<static>  $query
     * @return EloquentBuilder<static>
     */
    public function scopeVigentes(EloquentBuilder $query): EloquentBuilder
    {
        return $query->whereIn('estado', self::ESTADOS_VIGENTES);
    }
}
<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Licita\Enums\StatusDfd;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property \Illuminate\Support\Carbon $data_previsao
 * @property string $grau_prioridade
 * @property string $justificativa
 * @property string $objeto
 * @property bool $previsao_pca
 * @property string|null $numero_pca
 * @property string|null $area_requisitante
 * @property array<int, array{nome: string, cargo: string, matricula: string}>|null $equipe_planejamento
 * @property string $status
 * @property bool $gerado_por_ia
 * @property int $elaborado_por
 * @property int|null $aprovado_por
 * @property \Illuminate\Support\Carbon|null $aprovado_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Processo $processo
 * @property-read \Illuminate\Database\Eloquent\Collection<int, DfdVersao> $versoes
 * @property-read User|null $elaborador
 * @property-read User|null $aprovador
 */
final class Dfd extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'licita_dfds';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'data_previsao',
        'grau_prioridade',
        'justificativa',
        'objeto',
        'previsao_pca',
        'numero_pca',
        'area_requisitante',
        'equipe_planejamento',
        'status',
        'gerado_por_ia',
        'elaborado_por',
        'aprovado_por',
        'aprovado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'data_previsao' => 'date',
        'previsao_pca' => 'boolean',
        'equipe_planejamento' => 'array',
        'gerado_por_ia' => 'boolean',
        'elaborado_por' => 'integer',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
    ];

    public function statusEnum(): StatusDfd
    {
        return StatusDfd::from($this->status);
    }

    /**
     * @return BelongsTo<Processo, $this>
     */
    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    /**
     * @return HasMany<DfdVersao, $this>
     */
    public function versoes(): HasMany
    {
        return $this->hasMany(DfdVersao::class, 'dfd_id')->orderBy('versao');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function elaborador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'elaborado_por');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function aprovador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por');
    }
}

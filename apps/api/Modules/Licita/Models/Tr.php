<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Licita\Enums\StatusTr;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property array<int, array{nome: string, cargo: string, matricula: string}>|null $equipe_planejamento
 * @property string|null $fundamentacao_contratacao
 * @property string|null $descricao_solucao
 * @property string|null $requisitos_contratacao
 * @property string|null $modelo_execucao
 * @property string|null $modelo_gestao_contrato
 * @property string|null $criterio_julgamento
 * @property string|null $obrigacoes_contratante
 * @property string|null $obrigacoes_contratada
 * @property string|null $sancoes_administrativas
 * @property string|null $vigencia_contrato
 * @property string|null $adequacao_orcamentaria
 * @property array<string, mixed>|null $campos_extras
 * @property string $status
 * @property int|null $elaborado_por
 * @property int|null $aprovado_por
 * @property \Illuminate\Support\Carbon|null $aprovado_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Processo $processo
 * @property-read \Illuminate\Database\Eloquent\Collection<int, TrVersao> $versoes
 * @property-read User|null $elaborador
 * @property-read User|null $aprovador
 */
final class Tr extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'licita_trs';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'equipe_planejamento',
        'fundamentacao_contratacao',
        'descricao_solucao',
        'requisitos_contratacao',
        'modelo_execucao',
        'modelo_gestao_contrato',
        'criterio_julgamento',
        'obrigacoes_contratante',
        'obrigacoes_contratada',
        'sancoes_administrativas',
        'vigencia_contrato',
        'adequacao_orcamentaria',
        'campos_extras',
        'status',
        'elaborado_por',
        'aprovado_por',
        'aprovado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_id' => 'integer',
        'equipe_planejamento' => 'array',
        'campos_extras' => 'array',
        'elaborado_por' => 'integer',
        'aprovado_por' => 'integer',
        'aprovado_em' => 'datetime',
    ];

    public function statusEnum(): StatusTr
    {
        return StatusTr::from($this->status);
    }

    /**
     * @return BelongsTo<Processo, $this>
     */
    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    /**
     * @return HasMany<TrVersao, $this>
     */
    public function versoes(): HasMany
    {
        return $this->hasMany(TrVersao::class, 'tr_id')->orderBy('versao');
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

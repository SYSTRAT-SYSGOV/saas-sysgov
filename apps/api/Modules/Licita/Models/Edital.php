<?php

declare(strict_types=1);

namespace Modules\Licita\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Licita\Enums\StatusEdital;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_id
 * @property array<int, array{nome: string, cargo: string, matricula: string}>|null $equipe_planejamento
 * @property string|null $preambulo
 * @property string|null $objeto
 * @property string|null $criterio_julgamento
 * @property string|null $condicoes_participacao
 * @property string|null $requisitos_habilitacao
 * @property string|null $procedimento_sessao_publica
 * @property string|null $prazo_recursal
 * @property string|null $sancoes_administrativas
 * @property string|null $disposicoes_gerais
 * @property array<string, mixed>|null $campos_extras
 * @property string $status
 * @property int|null $elaborado_por
 * @property int|null $aprovado_por
 * @property \Illuminate\Support\Carbon|null $aprovado_em
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read Processo $processo
 * @property-read \Illuminate\Database\Eloquent\Collection<int, EditalVersao> $versoes
 * @property-read User|null $elaborador
 * @property-read User|null $aprovador
 */
final class Edital extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'licita_editais';

    protected $fillable = [
        'tenant_id',
        'processo_id',
        'equipe_planejamento',
        'preambulo',
        'objeto',
        'criterio_julgamento',
        'condicoes_participacao',
        'requisitos_habilitacao',
        'procedimento_sessao_publica',
        'prazo_recursal',
        'sancoes_administrativas',
        'disposicoes_gerais',
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

    public function statusEnum(): StatusEdital
    {
        return StatusEdital::from($this->status);
    }

    /**
     * @return BelongsTo<Processo, $this>
     */
    public function processo(): BelongsTo
    {
        return $this->belongsTo(Processo::class, 'processo_id');
    }

    /**
     * @return HasMany<EditalVersao, $this>
     */
    public function versoes(): HasMany
    {
        return $this->hasMany(EditalVersao::class, 'edital_id')->orderBy('versao');
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

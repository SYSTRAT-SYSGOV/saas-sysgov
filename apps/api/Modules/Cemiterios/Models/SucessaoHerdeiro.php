<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\Parentesco;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $sucessao_id
 * @property int|null $pessoa_id
 * @property string $nome
 * @property Parentesco $parentesco
 * @property string|null $documento
 * @property int $ordem
 * @property bool $direito_representacao
 * @property bool $titular_indicado
 * @property int|null $herdeiro_representado_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Modules\Pessoas\Models\Pessoa|null $pessoa
 */
final class SucessaoHerdeiro extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'sucessao_herdeiros';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'parentesco' => Parentesco::class,
        'ordem' => 'integer',
        'direito_representacao' => 'boolean',
        'titular_indicado' => 'boolean',
    ];

    /** @return BelongsTo<Sucessao, $this> */
    public function sucessao(): BelongsTo
    {
        return $this->belongsTo(Sucessao::class, 'sucessao_id');
    }

    /** @return BelongsTo<SucessaoHerdeiro, $this> */
    public function herdeiroRepresentado(): BelongsTo
    {
        return $this->belongsTo(SucessaoHerdeiro::class, 'herdeiro_representado_id');
    }

    /** @return BelongsTo<\Modules\Pessoas\Models\Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(\Modules\Pessoas\Models\Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<SucessaoHerdeiro, $this> */
    public function representados(): HasMany
    {
        return $this->hasMany(SucessaoHerdeiro::class, 'herdeiro_representado_id');
    }
}
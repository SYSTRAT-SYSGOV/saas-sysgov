<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Database\Factories\PessoaSocioFactory;

/**
 * Quadro societário: vincula uma pessoa jurídica a um sócio que é obrigatoriamente
 * uma pessoa física do mesmo tenant (spec: Quadro societário de pessoa jurídica).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property int $socio_pessoa_id
 * @property string|null $percentual_participacao
 * @property string $papel
 * @property \Illuminate\Support\Carbon|null $data_entrada
 * @property \Illuminate\Support\Carbon|null $data_saida
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class PessoaSocio extends Model
{
    /** @use HasFactory<PessoaSocioFactory> */
    use HasFactory;
    use TenantAware;
    use SoftDeletes;

    public const PAPEIS = ['socio', 'socio_administrador', 'representante_legal'];

    protected static function newFactory(): PessoaSocioFactory
    {
        return PessoaSocioFactory::new();
    }

    protected $table = 'pessoa_socios';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'data_entrada' => 'date',
        'data_saida' => 'date',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function socio(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'socio_pessoa_id');
    }
}

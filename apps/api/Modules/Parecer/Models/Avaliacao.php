<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Conceito (A, EP, NA) de um aluno numa habilidade e trimestre; um por (aluno, habilidade, trimestre).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property int $habilidade_id
 * @property int $trimestre
 * @property string $conceito
 * @property int|null $avaliado_por
 */
final class Avaliacao extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_avaliacoes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'habilidade_id', 'trimestre', 'conceito', 'avaliado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'habilidade_id' => 'integer', 'trimestre' => 'integer', 'avaliado_por' => 'integer', 'escola_id' => 'integer'];

    /** @return BelongsTo<Habilidade, $this> */
    public function habilidade(): BelongsTo
    {
        return $this->belongsTo(Habilidade::class, 'habilidade_id');
    }
}

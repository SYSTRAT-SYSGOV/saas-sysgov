<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;

/**
 * Nota de um aluno numa matéria e trimestre do ano letivo (única por combinação; relançar substitui).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property int $materia_id
 * @property int $ano_letivo
 * @property int $trimestre
 * @property string $nota
 * @property string|null $nota_recuperacao
 * @property int|null $lancado_por
 */
final class Nota extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_notas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'materia_id', 'ano_letivo', 'trimestre', 'nota', 'nota_recuperacao', 'lancado_por'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'aluno_id' => 'integer', 'materia_id' => 'integer', 'ano_letivo' => 'integer',
        'trimestre' => 'integer', 'nota' => 'decimal:1', 'nota_recuperacao' => 'decimal:1', 'lancado_por' => 'integer',
    ];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }

    /** @return BelongsTo<Materia, $this> */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id')->withTrashed();
    }
}

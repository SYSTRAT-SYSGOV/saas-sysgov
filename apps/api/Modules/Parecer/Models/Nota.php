<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Nota (0 a 10) do aluno numa matéria e trimestre, nas séries que têm nota.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property string $materia
 * @property int $trimestre
 * @property float $nota
 * @property int|null $lancado_por
 */
final class Nota extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_notas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'materia', 'trimestre', 'nota', 'lancado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'trimestre' => 'integer', 'nota' => 'float', 'lancado_por' => 'integer', 'escola_id' => 'integer'];
}

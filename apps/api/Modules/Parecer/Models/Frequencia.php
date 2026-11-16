<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Chamada de um aluno num dia: C (compareceu) ou F (faltou); cada falta conta as aulas do dia.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $aluno_id
 * @property \Illuminate\Support\Carbon $data
 * @property string $status
 * @property int $aulas
 * @property int $faltas
 * @property int|null $lancado_por
 */
final class Frequencia extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_frequencias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turma_id', 'aluno_id', 'data', 'status', 'aulas', 'faltas', 'lancado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turma_id' => 'integer', 'aluno_id' => 'integer', 'data' => 'date:Y-m-d', 'aulas' => 'integer', 'faltas' => 'integer', 'lancado_por' => 'integer', 'escola_id' => 'integer'];
}

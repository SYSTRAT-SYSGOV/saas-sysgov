<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;

/**
 * Presença de um aluno numa data (uma por aluno e data; nova chamada substitui).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $aluno_id
 * @property \Illuminate\Support\Carbon $data
 * @property string $presenca
 * @property string|null $observacao
 */
final class Frequencia extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_frequencias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turma_id', 'aluno_id', 'data', 'presenca', 'aulas', 'observacao', 'registrado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turma_id' => 'integer', 'aluno_id' => 'integer', 'aulas' => 'integer', 'data' => 'date:Y-m-d', 'registrado_por' => 'integer'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }
}

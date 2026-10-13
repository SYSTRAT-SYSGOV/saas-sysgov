<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vínculo turma × matéria, com o professor (usuário do tenant) responsável.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $materia_id
 * @property int|null $professor_user_id
 * @property-read Turma|null $turma
 * @property-read Materia|null $materia
 * @property-read User|null $professor
 */
final class TurmaMateria extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_turma_materias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turma_id', 'materia_id', 'professor_user_id'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turma_id' => 'integer', 'materia_id' => 'integer', 'professor_user_id' => 'integer'];

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    /** @return BelongsTo<Materia, $this> */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    /** @return BelongsTo<User, $this> */
    public function professor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'professor_user_id');
    }
}

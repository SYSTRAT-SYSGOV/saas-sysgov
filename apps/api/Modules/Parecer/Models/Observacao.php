<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Observação do professor sobre o aluno, por trimestre e matéria; entra no fim do texto da matéria no parecer.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property int $trimestre
 * @property string $materia
 * @property string $texto
 * @property int|null $atualizado_por
 */
final class Observacao extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_observacoes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'trimestre', 'materia', 'texto', 'atualizado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'trimestre' => 'integer', 'atualizado_por' => 'integer', 'escola_id' => 'integer'];
}

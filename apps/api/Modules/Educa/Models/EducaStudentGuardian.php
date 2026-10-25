<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Models\Pessoa;

/**
 * Vínculo de Parentesco e Responsabilidade Legal com o Estudante.
 */
final class EducaStudentGuardian extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_student_guardians';

    protected $fillable = [
        'tenant_id',
        'aluno_pessoa_id',
        'responsavel_pessoa_id',
        'tipo_parentesco',
        'is_responsavel_financeiro',
        'is_responsavel_pedagogico',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'aluno_pessoa_id' => 'integer',
        'responsavel_pessoa_id' => 'integer',
        'is_responsavel_financeiro' => 'boolean',
        'is_responsavel_pedagogico' => 'boolean',
    ];

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'aluno_pessoa_id');
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'responsavel_pessoa_id');
    }
}

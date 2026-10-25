<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Prontuário de Restrição Alimentar / Alergia do Estudante.
 */
final class EducaDietaryRestriction extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_dietary_restrictions';

    protected $fillable = [
        'tenant_id',
        'pessoa_id',
        'tipo_restricao',
        'alimento_alergeno',
        'severidade',
        'sintomas_reacao',
        'conduta_emergencia',
        'requer_substituicao_especial',
        'alimento_substituto_recomendado',
        'laudo_medico_crm',
        'laudo_medico_emissor',
        'laudo_medico_data',
        'laudo_documento_url',
        'observacoes',
        'status',
        'responsavel_registro_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'requer_substituicao_especial' => 'boolean',
        'laudo_medico_data' => 'date',
        'responsavel_registro_id' => 'integer',
    ];

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function pessoa(): BelongsTo
    {
        return $this->aluno();
    }

    /**
     * @return BelongsTo<User, self>
     */
    public function responsavelRegistro(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_registro_id');
    }

    public function isGrave(): bool
    {
        return $this->severidade === 'grave_anafilaxia';
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Escala Decimal e Tabela de Arredondamento Oficial da Rede.
 */
final class EducaGradeScale extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_grade_scales';

    protected $fillable = [
        'tenant_id',
        'evaluation_rule_id',
        'limite_inferior',
        'limite_superior',
        'nota_arredondada',
        'conceito_alfabetico',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'limite_inferior' => 'decimal:2',
        'limite_superior' => 'decimal:2',
        'nota_arredondada' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<EducaEvaluationRule, self>
     */
    public function regra(): BelongsTo
    {
        return $this->belongsTo(EducaEvaluationRule::class, 'evaluation_rule_id');
    }
}

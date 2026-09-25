<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $questao_id
 * @property string $texto
 * @property bool $correta
 * @property int $ordem
 * @property-read Questao $questao
 */
final class QuestaoAlternativa extends Model
{
    use TenantAware;

    protected $table = 'cursos_questao_alternativas';

    protected $fillable = ['tenant_id', 'questao_id', 'texto', 'correta', 'ordem'];

    protected $casts = [
        'tenant_id' => 'integer',
        'questao_id' => 'integer',
        'correta' => 'boolean',
        'ordem' => 'integer',
    ];

    /** @return BelongsTo<Questao, $this> */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class, 'questao_id');
    }
}

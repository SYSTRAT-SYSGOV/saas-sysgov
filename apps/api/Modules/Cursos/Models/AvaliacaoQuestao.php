<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Questão escolhida do banco para uma avaliação, com a posição dela.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $avaliacao_id
 * @property int $questao_id
 * @property int $ordem
 * @property-read Avaliacao $avaliacao
 * @property-read Questao $questao
 */
final class AvaliacaoQuestao extends Model
{
    use TenantAware;

    protected $table = 'cursos_avaliacao_questoes';

    protected $fillable = ['tenant_id', 'avaliacao_id', 'questao_id', 'ordem'];

    protected $casts = [
        'tenant_id' => 'integer',
        'avaliacao_id' => 'integer',
        'questao_id' => 'integer',
        'ordem' => 'integer',
    ];

    /** @return BelongsTo<Avaliacao, $this> */
    public function avaliacao(): BelongsTo
    {
        return $this->belongsTo(Avaliacao::class, 'avaliacao_id');
    }

    /** @return BelongsTo<Questao, $this> */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class, 'questao_id');
    }
}

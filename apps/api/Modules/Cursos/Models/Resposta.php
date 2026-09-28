<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $tentativa_id
 * @property int $questao_id
 * @property int|null $alternativa_id
 * @property string|null $texto
 * @property string|null $pontos
 * @property string|null $comentario
 * @property int|null $corrigida_por
 * @property \Illuminate\Support\Carbon|null $corrigida_em
 * @property-read Tentativa $tentativa
 * @property-read Questao $questao
 * @property-read User|null $corretor
 */
final class Resposta extends Model
{
    use TenantAware;

    protected $table = 'cursos_respostas';

    protected $fillable = [
        'tenant_id', 'tentativa_id', 'questao_id', 'alternativa_id', 'texto', 'pontos', 'comentario', 'corrigida_por', 'corrigida_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'tentativa_id' => 'integer',
        'questao_id' => 'integer',
        'alternativa_id' => 'integer',
        'pontos' => 'decimal:2',
        'corrigida_por' => 'integer',
        'corrigida_em' => 'datetime',
    ];

    /** @return BelongsTo<Tentativa, $this> */
    public function tentativa(): BelongsTo
    {
        return $this->belongsTo(Tentativa::class, 'tentativa_id');
    }

    /** @return BelongsTo<Questao, $this> */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class, 'questao_id');
    }

    /** @return BelongsTo<User, $this> */
    public function corretor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrigida_por');
    }
}

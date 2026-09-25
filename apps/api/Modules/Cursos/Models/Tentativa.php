<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Cursos\Enums\StatusTentativa;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $avaliacao_id
 * @property int $inscricao_id
 * @property int $numero
 * @property string $status
 * @property \Illuminate\Support\Carbon $iniciada_em
 * @property \Illuminate\Support\Carbon|null $prazo_em
 * @property \Illuminate\Support\Carbon|null $enviada_em
 * @property \Illuminate\Support\Carbon|null $corrigida_em
 * @property string|null $nota
 * @property array<int, array<string, mixed>> $questoes snapshot com gabarito (design D6)
 * @property-read Avaliacao $avaliacao
 * @property-read Inscricao $inscricao
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Resposta> $respostas
 */
final class Tentativa extends Model
{
    use TenantAware;

    protected $table = 'cursos_tentativas';

    protected $fillable = [
        'tenant_id', 'avaliacao_id', 'inscricao_id', 'numero', 'status', 'iniciada_em', 'prazo_em', 'enviada_em',
        'corrigida_em', 'nota', 'questoes',
    ];

    /**
     * O snapshot traz o gabarito: nunca sai numa serialização direta do model.
     * A saída ao participante é montada por Resources com lista explícita de campos.
     */
    protected $hidden = ['questoes'];

    protected $casts = [
        'tenant_id' => 'integer',
        'avaliacao_id' => 'integer',
        'inscricao_id' => 'integer',
        'numero' => 'integer',
        'iniciada_em' => 'datetime',
        'prazo_em' => 'datetime',
        'enviada_em' => 'datetime',
        'corrigida_em' => 'datetime',
        'nota' => 'decimal:2',
        'questoes' => 'array',
    ];

    public function statusEnum(): StatusTentativa
    {
        return StatusTentativa::from($this->status);
    }

    /** @return BelongsTo<Avaliacao, $this> */
    public function avaliacao(): BelongsTo
    {
        return $this->belongsTo(Avaliacao::class, 'avaliacao_id');
    }

    /** @return BelongsTo<Inscricao, $this> */
    public function inscricao(): BelongsTo
    {
        return $this->belongsTo(Inscricao::class, 'inscricao_id');
    }

    /** @return HasMany<Resposta, $this> */
    public function respostas(): HasMany
    {
        return $this->hasMany(Resposta::class, 'tentativa_id');
    }
}

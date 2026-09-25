<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Cursos\Contracts\ComLiberacao;
use Modules\Cursos\Enums\RegraLiberacao;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property int|null $aula_id
 * @property string $titulo
 * @property string|null $instrucoes
 * @property int $peso
 * @property int $tentativas_max
 * @property int|null $tempo_limite_minutos
 * @property bool $publicada
 * @property string $liberacao_regra
 * @property int|null $liberacao_dias
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 * @property-read Aula|null $aula
 * @property-read \Illuminate\Database\Eloquent\Collection<int, AvaliacaoQuestao> $questoes
 */
final class Avaliacao extends Model implements ComLiberacao
{
    use TenantAware;

    protected $table = 'cursos_avaliacoes';

    protected $fillable = [
        'tenant_id', 'curso_id', 'aula_id', 'titulo', 'instrucoes', 'peso', 'tentativas_max', 'tempo_limite_minutos',
        'publicada', 'liberacao_regra', 'liberacao_dias',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'aula_id' => 'integer',
        'peso' => 'integer',
        'tentativas_max' => 'integer',
        'tempo_limite_minutos' => 'integer',
        'publicada' => 'boolean',
        'liberacao_dias' => 'integer',
    ];

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /** @return BelongsTo<Aula, $this> */
    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    /** @return HasMany<AvaliacaoQuestao, $this> */
    public function questoes(): HasMany
    {
        return $this->hasMany(AvaliacaoQuestao::class, 'avaliacao_id')->orderBy('ordem')->orderBy('id');
    }

    /** @return HasMany<Tentativa, $this> */
    public function tentativas(): HasMany
    {
        return $this->hasMany(Tentativa::class, 'avaliacao_id');
    }

    public function regraLiberacao(): RegraLiberacao
    {
        return RegraLiberacao::from($this->liberacao_regra);
    }

    public function diasLiberacao(): ?int
    {
        return $this->liberacao_dias;
    }

    public function aulaLiberacaoId(): ?int
    {
        return $this->aula_id;
    }
}

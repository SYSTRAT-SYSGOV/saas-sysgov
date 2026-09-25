<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Cursos\Enums\TipoQuestao;

/**
 * Questão do banco de um curso. Só o Administrador a lê (traz gabarito); o
 * participante vê a versão do snapshot da tentativa (design D6).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property string $tipo
 * @property string $enunciado
 * @property string $pontuacao
 * @property string|null $orientacao_correcao
 * @property bool $ativa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 * @property-read \Illuminate\Database\Eloquent\Collection<int, QuestaoAlternativa> $alternativas
 */
final class Questao extends Model
{
    use TenantAware;

    protected $table = 'cursos_questoes';

    protected $fillable = ['tenant_id', 'curso_id', 'tipo', 'enunciado', 'pontuacao', 'orientacao_correcao', 'ativa'];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'pontuacao' => 'decimal:2',
        'ativa' => 'boolean',
    ];

    public function tipoEnum(): TipoQuestao
    {
        return TipoQuestao::from($this->tipo);
    }

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /** @return HasMany<QuestaoAlternativa, $this> */
    public function alternativas(): HasMany
    {
        return $this->hasMany(QuestaoAlternativa::class, 'questao_id')->orderBy('ordem')->orderBy('id');
    }

    /** @return HasMany<AvaliacaoQuestao, $this> */
    public function avaliacoes(): HasMany
    {
        return $this->hasMany(AvaliacaoQuestao::class, 'questao_id');
    }

    /** @return HasMany<Resposta, $this> */
    public function respostas(): HasMany
    {
        return $this->hasMany(Resposta::class, 'questao_id');
    }
}

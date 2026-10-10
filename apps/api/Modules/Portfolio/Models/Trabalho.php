<?php

declare(strict_types=1);

namespace Modules\Portfolio\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Concerns\EscolaAware;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;

/**
 * Trabalho do portfólio de um aluno. Turma e matéria são as do momento do registro (design D2).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property int $turma_id
 * @property int $materia_id
 * @property int $ano_letivo
 * @property int|null $trimestre
 * @property string $titulo
 * @property string|null $descricao
 * @property string|null $observacoes
 * @property \Illuminate\Support\Carbon $data
 * @property int $avaliacao_decimos
 * @property int $registrado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property-read Aluno|null $aluno
 * @property-read Turma|null $turma
 * @property-read Materia|null $materia
 * @property-read User|null $autor
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Imagem> $imagens
 */
final class Trabalho extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'portfolio_trabalhos';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'aluno_id', 'turma_id', 'materia_id', 'ano_letivo', 'trimestre', 'titulo', 'descricao',
        'observacoes', 'data', 'avaliacao_decimos', 'registrado_por',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'escola_id' => 'integer', 'aluno_id' => 'integer', 'turma_id' => 'integer',
        'materia_id' => 'integer', 'ano_letivo' => 'integer', 'trimestre' => 'integer', 'data' => 'date',
        'avaliacao_decimos' => 'integer', 'registrado_por' => 'integer',
    ];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id')->withTrashed();
    }

    /** @return BelongsTo<Materia, $this> */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }

    /** @return HasMany<Imagem, $this> */
    public function imagens(): HasMany
    {
        return $this->hasMany(Imagem::class, 'trabalho_id')->orderBy('ordem');
    }
}

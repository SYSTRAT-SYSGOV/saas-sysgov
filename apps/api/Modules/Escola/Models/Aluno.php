<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Modules\Pessoas\Models\Pessoa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Enums\SituacaoAluno;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int|null $turma_id
 * @property int|null $turma_origem_id
 * @property int|null $numero
 * @property int $pessoa_id pessoa do Cadastro de Pessoas (fonte de CPF e nascimento)
 * @property string $nome
 * @property string|null $cgm
 * @property string|null $mae
 * @property string|null $pai
 * @property string|null $foto_path
 * @property string $situacao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Turma|null $turma
 * @property-read Turma|null $turmaOrigem
 * @property-read \Illuminate\Database\Eloquent\Collection<int, AlunoContato> $contatos
 */
final class Aluno extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_alunos';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'turma_id', 'turma_origem_id', 'numero', 'nome', 'cgm', 'mae', 'pai', 'foto_path', 'situacao',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'turma_id' => 'integer',
        'turma_origem_id' => 'integer',
        'numero' => 'integer',
        'pessoa_id' => 'integer',
    ];

    /** @var list<string> */
    protected $appends = ['cpf_mascarado'];

    /** CPF mascarado, da pessoa do cadastro central (pessoa pendente não tem CPF). */
    public function getCpfMascaradoAttribute(): ?string
    {
        return $this->pessoa?->documento_pendente ? null : $this->pessoa?->cpf_mascarado;
    }

    /** Data de nascimento, da pessoa do cadastro central. */
    public function nascimentoDaPessoa(): ?\Illuminate\Support\Carbon
    {
        return $this->pessoa?->data_nascimento;
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** Nome sempre em maiúsculas (padrão das listas oficiais da escola). */
    public function setNomeAttribute(string $valor): void
    {
        $this->attributes['nome'] = mb_strtoupper(trim(preg_replace('/\s+/', ' ', $valor) ?? $valor), 'UTF-8');
    }

    public function situacaoEnum(): SituacaoAluno
    {
        return SituacaoAluno::from($this->situacao);
    }

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    /** @return BelongsTo<Turma, $this> */
    public function turmaOrigem(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_origem_id')->withTrashed();
    }

    /** @return HasMany<AlunoContato, $this> */
    public function contatos(): HasMany
    {
        return $this->hasMany(AlunoContato::class, 'aluno_id')->orderBy('ordem');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;
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
 * @property int|null $pessoa_id pessoa do Cadastro de Pessoas (quando o aluno tem CPF)
 * @property string $nome
 * @property string|null $cpf cifrado; nunca devolvido completo
 * @property string|null $cpf_hash
 * @property string|null $cgm
 * @property \Illuminate\Support\Carbon|null $nascimento
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
        'tenant_id', 'turma_id', 'turma_origem_id', 'numero', 'nome', 'cpf', 'cgm', 'nascimento', 'mae', 'pai', 'foto_path', 'situacao',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'turma_id' => 'integer',
        'turma_origem_id' => 'integer',
        'numero' => 'integer',
        'nascimento' => 'date:Y-m-d',
        'pessoa_id' => 'integer',
        'cpf' => 'encrypted',
    ];

    /** @var list<string> */
    protected $hidden = ['cpf', 'cpf_hash'];

    /** @var list<string> */
    protected $appends = ['cpf_mascarado'];

    protected static function booted(): void
    {
        // CPF guardado só com dígitos; o hash (HMAC do módulo Pessoas) serve à busca e à unicidade.
        static::saving(function (self $aluno): void {
            if (!$aluno->isDirty('cpf')) {
                return;
            }
            $digitos = Documento::somenteDigitos((string) $aluno->cpf);
            $aluno->cpf = $digitos === '' ? null : $digitos;
            $aluno->cpf_hash = $digitos === '' ? null : Documento::hash($digitos);
        });
    }

    public function getCpfMascaradoAttribute(): ?string
    {
        return $this->cpf ? Documento::mascarar($this->cpf) : null;
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

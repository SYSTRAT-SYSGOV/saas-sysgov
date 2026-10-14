<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Escola\Models\Aluno;

/**
 * Estudante acompanhado pela equipe multiprofissional (o "especial" do legado — D4).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $aluno_id
 * @property string|null $observacoes
 * @property bool $ativo
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Modules\Escola\Models\Aluno|null $aluno
 * @property \Illuminate\Database\Eloquent\Collection<int, Condicao> $condicoes
 * @property \Illuminate\Database\Eloquent\Collection<int, Profissional> $profissionais
 * @property \Illuminate\Database\Eloquent\Collection<int, Laudo> $laudos
 */
final class Acompanhado extends Model
{
    use TenantAware;

    protected $table = 'multi_acompanhados';

    protected $fillable = ['tenant_id', 'aluno_id', 'observacoes', 'ativo', 'criado_por'];

    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'ativo' => 'boolean', 'criado_por' => 'integer'];

    /**
     * O aluno pode ser de qualquer escola do tenant: a consulta não fica presa à escola de trabalho.
     *
     * @return BelongsTo<Aluno, $this>
     */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withoutGlobalScope('escola')->withTrashed();
    }

    /** @return BelongsToMany<Condicao, $this> */
    public function condicoes(): BelongsToMany
    {
        return $this->belongsToMany(Condicao::class, 'multi_acompanhado_condicoes', 'acompanhado_id', 'condicao_id')
            ->withPivot('diagnosticado_em');
    }

    /** @return BelongsToMany<Profissional, $this> */
    public function profissionais(): BelongsToMany
    {
        return $this->belongsToMany(Profissional::class, 'multi_acompanhado_profissionais', 'acompanhado_id', 'profissional_id')
            ->withPivot('papel');
    }

    /** @return HasMany<Laudo, $this> */
    public function laudos(): HasMany
    {
        return $this->hasMany(Laudo::class, 'acompanhado_id')->orderByDesc('emitido_em')->orderByDesc('id');
    }
}

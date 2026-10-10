<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Integrante da equipe gestora, cadastrado por nome (sem exigir login) — design D17.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int|null $pessoa_id pessoa do Cadastro de Pessoas (nulo nos membros antigos, só por nome)
 * @property string $nome
 * @property string $cargo diretor | diretor_auxiliar | secretaria | pedagoga
 * @property int $ordem
 */
final class MembroEquipe extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    public const CARGOS = ['diretor', 'diretor_auxiliar', 'secretaria', 'pedagoga'];

    protected $table = 'escola_equipe';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'pessoa_id', 'nome', 'cargo', 'ordem'];

    /** @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\Modules\Pessoas\Models\Pessoa, $this> */
    public function pessoa(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\Modules\Pessoas\Models\Pessoa::class, 'pessoa_id');
    }

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'ordem' => 'integer'];

    public function setNomeAttribute(string $valor): void
    {
        $this->attributes['nome'] = trim(preg_replace('/\s+/', ' ', $valor) ?? $valor);
    }
}

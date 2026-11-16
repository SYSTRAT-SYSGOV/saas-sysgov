<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Concerns\EscolaAware;
use Modules\Escola\Models\Turma;

/**
 * Série (1º ao 5º ano) de uma turma do cadastro Escola; só turmas com série aparecem no módulo.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $serie
 * @property \Modules\Escola\Models\Turma|null $turma
 */
final class TurmaSerie extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_turmas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turma_id', 'serie'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turma_id' => 'integer', 'serie' => 'integer', 'escola_id' => 'integer'];

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }
}

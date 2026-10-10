<?php

declare(strict_types=1);

namespace Modules\Passeio\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;

/**
 * Assento ocupado de um veículo (liberar = apagar a linha).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $passeio_id
 * @property int $veiculo_id
 * @property int $numero
 * @property int $aluno_id
 */
final class Assento extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'passeio_assentos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'passeio_id', 'veiculo_id', 'numero', 'aluno_id'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'passeio_id' => 'integer', 'veiculo_id' => 'integer', 'numero' => 'integer', 'aluno_id' => 'integer'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Passeio\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Aluno;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $passeio_id
 * @property int $aluno_id
 * @property bool $vai
 * @property bool $autorizacao_entregue
 * @property bool $pago
 * @property string|null $observacao
 * @property-read Passeio|null $passeio
 * @property-read Aluno|null $aluno
 */
final class Inscricao extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'passeio_inscricoes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'passeio_id', 'aluno_id', 'vai', 'autorizacao_entregue', 'pago', 'observacao'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'passeio_id' => 'integer', 'aluno_id' => 'integer',
        'vai' => 'boolean', 'autorizacao_entregue' => 'boolean', 'pago' => 'boolean',
    ];

    /** @return BelongsTo<Passeio, $this> */
    public function passeio(): BelongsTo
    {
        return $this->belongsTo(Passeio::class, 'passeio_id');
    }

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }
}

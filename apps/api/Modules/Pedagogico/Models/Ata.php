<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Turma;
use Modules\Pedagogico\Enums\StatusAta;

/**
 * Ata do conselho de classe.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property int $ano_letivo
 * @property int $periodo
 * @property string $status
 * @property array<string, string>|null $assinaturas papel => data URL PNG
 */
final class Ata extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_atas';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'turma_id', 'ano_letivo', 'periodo', 'data_reuniao', 'direcao', 'pedagogia', 'secretaria',
        'texto_introducao', 'texto_conclusao', 'deliberacoes', 'assinaturas', 'aprovados', 'recuperacao', 'retidos', 'status', 'registrado_por',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'turma_id' => 'integer', 'ano_letivo' => 'integer', 'periodo' => 'integer',
        'data_reuniao' => 'date:Y-m-d', 'aprovados' => 'integer', 'recuperacao' => 'integer', 'retidos' => 'integer',
        'registrado_por' => 'integer', 'assinaturas' => 'array',
    ];

    public function statusEnum(): StatusAta
    {
        return StatusAta::from($this->status);
    }

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id')->withTrashed();
    }
}

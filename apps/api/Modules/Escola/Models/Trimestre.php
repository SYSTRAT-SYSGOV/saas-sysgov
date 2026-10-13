<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Enums\SituacaoPeriodo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $ano_letivo
 * @property int $numero
 * @property \Illuminate\Support\Carbon $data_inicio
 * @property \Illuminate\Support\Carbon $data_fim
 * @property-read string $situacao situação calculada pela data atual
 */
final class Trimestre extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_trimestres';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'ano_letivo', 'numero', 'data_inicio', 'data_fim'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'ano_letivo' => 'integer',
        'numero' => 'integer',
        'data_inicio' => 'date:Y-m-d',
        'data_fim' => 'date:Y-m-d',
    ];

    /** @var list<string> */
    protected $appends = ['situacao'];

    public function situacaoEnum(): SituacaoPeriodo
    {
        return SituacaoPeriodo::calcular($this->ano_letivo, $this->data_inicio, $this->data_fim);
    }

    public function getSituacaoAttribute(): string
    {
        return $this->situacaoEnum()->value;
    }
}

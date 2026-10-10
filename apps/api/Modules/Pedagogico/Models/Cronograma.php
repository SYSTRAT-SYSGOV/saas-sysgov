<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Período de preenchimento do pré-conselho. Informativo: não bloqueia o preenchimento das fichas.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $ano_letivo
 * @property int $periodo
 * @property \Illuminate\Support\Carbon $data_inicio
 * @property \Illuminate\Support\Carbon $data_fim
 */
final class Cronograma extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_cronogramas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'ano_letivo', 'periodo', 'data_inicio', 'data_fim'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'ano_letivo' => 'integer', 'periodo' => 'integer',
        'data_inicio' => 'date:Y-m-d', 'data_fim' => 'date:Y-m-d',
    ];

    /** @var list<string> */
    protected $appends = ['situacao'];

    /** agendado | ativo | encerrado | arquivo (ano letivo diferente do atual). */
    public function getSituacaoAttribute(): string
    {
        $hoje = Carbon::today();

        return match (true) {
            $this->ano_letivo !== (int) $hoje->year => 'arquivo',
            $hoje->lt($this->data_inicio) => 'agendado',
            $hoje->lte($this->data_fim) => 'ativo',
            default => 'encerrado',
        };
    }
}

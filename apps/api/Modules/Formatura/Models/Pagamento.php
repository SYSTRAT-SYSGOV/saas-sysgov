<?php

declare(strict_types=1);

namespace Modules\Formatura\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $participacao_id
 * @property int $numero_parcela
 * @property \Illuminate\Support\Carbon $data_pagamento
 * @property int $valor_centavos
 * @property string $forma_pagamento
 * @property string|null $chave_pix
 * @property string|null $observacao
 * @property-read Participacao|null $participacao
 */
final class Pagamento extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'formatura_pagamentos';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'participacao_id', 'numero_parcela', 'data_pagamento', 'valor_centavos', 'forma_pagamento', 'chave_pix', 'observacao', 'registrado_por',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'participacao_id' => 'integer', 'numero_parcela' => 'integer',
        'data_pagamento' => 'date:Y-m-d', 'valor_centavos' => 'integer', 'registrado_por' => 'integer',
    ];

    /** @return BelongsTo<Participacao, $this> */
    public function participacao(): BelongsTo
    {
        return $this->belongsTo(Participacao::class, 'participacao_id');
    }
}

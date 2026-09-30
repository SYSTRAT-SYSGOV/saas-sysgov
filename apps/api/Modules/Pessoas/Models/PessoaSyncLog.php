<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $integracao_id
 * @property string $tipo
 * @property string $direcao
 * @property string $status
 * @property int $registros_processados
 * @property int $registros_sucesso
 * @property int $registros_falha
 * @property array<string, mixed>|null $detalhes
 */
final class PessoaSyncLog extends Model
{
    use TenantAware;

    protected $table = 'pessoas_sync_logs';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'registros_processados' => 'integer',
        'registros_sucesso' => 'integer',
        'registros_falha' => 'integer',
        'detalhes' => 'array',
    ];

    /** @return BelongsTo<PessoaIntegracao, $this> */
    public function integracao(): BelongsTo
    {
        return $this->belongsTo(PessoaIntegracao::class, 'integracao_id');
    }
}

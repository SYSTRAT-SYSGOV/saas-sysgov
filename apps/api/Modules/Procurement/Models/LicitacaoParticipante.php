<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $pessoa_id pessoa jurídica do Cadastro de Pessoas
 * @property string $razao_social
 * @property string|null $cnpj
 */
final class LicitacaoParticipante extends Model
{
    use TenantAware;

    protected $table = 'licitacao_participantes';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'pessoa_id',
        'razao_social',
        'cnpj',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'pessoa_id' => 'integer',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class);
    }
}

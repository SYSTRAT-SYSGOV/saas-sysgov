<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Documento enviado pela entidade (D12, D15). `tipo` é a chave do documento exigido nas configurações; vale o envio
 * mais recente de cada tipo.
 *
 * @property int $id
 * @property int $entidade_id
 * @property string $tipo
 * @property string $caminho
 * @property string $mime
 * @property Carbon $data_envio
 * @property Carbon|null $validade
 * @property string $situacao pendente | aprovado | reprovado
 * @property string|null $observacao_prefeitura
 */
final class EntidadeDocumento extends Model
{
    use TenantAware;

    protected $table = 'inservivel_entidade_documentos';

    protected $fillable = ['tenant_id', 'entidade_id', 'tipo', 'caminho', 'mime', 'data_envio', 'validade', 'situacao', 'observacao_prefeitura'];

    protected $hidden = ['caminho'];

    protected $casts = [
        'tenant_id' => 'integer',
        'entidade_id' => 'integer',
        'data_envio' => 'date:Y-m-d',
        'validade' => 'date:Y-m-d',
    ];

    protected $attributes = ['situacao' => 'pendente'];

    /** @return BelongsTo<Entidade, $this> */
    public function entidade(): BelongsTo
    {
        return $this->belongsTo(Entidade::class, 'entidade_id');
    }
}

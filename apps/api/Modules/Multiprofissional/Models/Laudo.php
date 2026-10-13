<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Laudo/documento do estudante acompanhado, em disco privado; servido só pela API depois da policy (D7).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $acompanhado_id
 * @property int|null $condicao_id
 * @property string $descricao
 * @property string|null $emitente
 * @property \Illuminate\Support\Carbon|null $emitido_em
 * @property string $arquivo_path
 * @property string $arquivo_mime
 * @property string $arquivo_nome
 * @property int $arquivo_tamanho
 * @property int|null $enviado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property Condicao|null $condicao
 */
final class Laudo extends Model
{
    use TenantAware;

    protected $table = 'multi_laudos';

    protected $fillable = [
        'tenant_id', 'acompanhado_id', 'condicao_id', 'descricao', 'emitente', 'emitido_em',
        'arquivo_path', 'arquivo_mime', 'arquivo_nome', 'arquivo_tamanho', 'enviado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'acompanhado_id' => 'integer',
        'condicao_id' => 'integer',
        'emitido_em' => 'date:Y-m-d',
        'arquivo_tamanho' => 'integer',
        'enviado_por' => 'integer',
    ];

    protected $hidden = ['arquivo_path'];

    /** @return BelongsTo<Acompanhado, $this> */
    public function acompanhado(): BelongsTo
    {
        return $this->belongsTo(Acompanhado::class, 'acompanhado_id');
    }

    /** @return BelongsTo<Condicao, $this> */
    public function condicao(): BelongsTo
    {
        return $this->belongsTo(Condicao::class, 'condicao_id');
    }
}

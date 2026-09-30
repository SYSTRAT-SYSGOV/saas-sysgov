<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Resposta de um campo extra na inscrição (design D9) — `rotulo`/`tipo` são um snapshot do
 * `CampoInscricao` no momento da resposta (mesmo padrão de `Resposta`/`Tentativa` na Fase 2):
 * editar o campo depois não reescreve o que já foi respondido.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $inscricao_id
 * @property int $campo_id
 * @property string $rotulo
 * @property string $tipo
 * @property string|null $valor
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Inscricao $inscricao
 * @property-read CampoInscricao $campo
 */
final class RespostaInscricao extends Model
{
    use TenantAware;

    protected $table = 'cursos_inscricao_respostas';

    protected $fillable = ['tenant_id', 'inscricao_id', 'campo_id', 'rotulo', 'tipo', 'valor'];

    protected $casts = [
        'tenant_id' => 'integer',
        'inscricao_id' => 'integer',
        'campo_id' => 'integer',
    ];

    /** @return BelongsTo<Inscricao, $this> */
    public function inscricao(): BelongsTo
    {
        return $this->belongsTo(Inscricao::class, 'inscricao_id');
    }

    /** @return BelongsTo<CampoInscricao, $this> */
    public function campo(): BelongsTo
    {
        return $this->belongsTo(CampoInscricao::class, 'campo_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $agendamento_id
 * @property int $inscricao_id
 * @property bool $presente
 * @property string $origem
 * @property int|null $registrado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read AulaAgendamento $agendamento
 * @property-read Inscricao $inscricao
 */
final class Presenca extends Model
{
    use TenantAware;

    protected $table = 'cursos_presencas';

    protected $fillable = ['tenant_id', 'agendamento_id', 'inscricao_id', 'presente', 'origem', 'registrado_por'];

    protected $casts = [
        'tenant_id' => 'integer',
        'agendamento_id' => 'integer',
        'inscricao_id' => 'integer',
        'presente' => 'boolean',
        'registrado_por' => 'integer',
    ];

    /** @return BelongsTo<AulaAgendamento, $this> */
    public function agendamento(): BelongsTo
    {
        return $this->belongsTo(AulaAgendamento::class, 'agendamento_id');
    }

    /** @return BelongsTo<Inscricao, $this> */
    public function inscricao(): BelongsTo
    {
        return $this->belongsTo(Inscricao::class, 'inscricao_id');
    }
}

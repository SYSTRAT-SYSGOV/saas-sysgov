<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Condicionante de uma licença deferida — ver spec `meio-ambiente/licenciamento`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_licenciamento_id
 * @property string $descricao
 * @property \Illuminate\Support\Carbon $prazo
 * @property string $situacao
 * @property \Illuminate\Support\Carbon|null $cumprida_em
 */
final class Condicionante extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_condicionantes';

    public const SITUACAO_PENDENTE = 'pendente';
    public const SITUACAO_CUMPRIDA = 'cumprida';

    protected $fillable = [
        'tenant_id',
        'processo_licenciamento_id',
        'descricao',
        'prazo',
        'situacao',
        'cumprida_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_licenciamento_id' => 'integer',
        'prazo' => 'date',
        'cumprida_em' => 'datetime',
    ];

    /** @return BelongsTo<ProcessoLicenciamento, $this> */
    public function processoLicenciamento(): BelongsTo
    {
        return $this->belongsTo(ProcessoLicenciamento::class, 'processo_licenciamento_id');
    }

    public function estaVencida(): bool
    {
        return $this->situacao === self::SITUACAO_PENDENTE && $this->prazo->isPast();
    }
}

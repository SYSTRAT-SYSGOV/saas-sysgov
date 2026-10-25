<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Condutor ou monitor credenciado no transporte escolar integrado ao MDM Pessoas.
 */
final class EducaTransportDriver extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const FUNCAO_MOTORISTA = 'motorista';
    public const FUNCAO_MONITOR = 'monitor';

    protected $table = 'educa_transport_drivers';

    protected $fillable = [
        'tenant_id',
        'pessoa_id',
        'tipo_funcao',
        'cnh_numero',
        'cnh_categoria',
        'cnh_validade',
        'curso_transporte_escolar',
        'validade_curso',
        'ativo',
    ];

    protected $casts = [
        'cnh_validade' => 'date:Y-m-d',
        'validade_curso' => 'date:Y-m-d',
        'curso_transporte_escolar' => 'boolean',
        'ativo' => 'boolean',
    ];

    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /**
     * Valida se motorista possui CNH categoria D ou E com validade vigente.
     */
    public function isCnhValida(): bool
    {
        if ($this->tipo_funcao !== self::FUNCAO_MOTORISTA) {
            return true;
        }

        if (! in_array(strtoupper((string) $this->cnh_categoria), ['D', 'E'], true)) {
            return false;
        }

        if (! $this->cnh_validade) {
            return false;
        }

        return Carbon::parse($this->cnh_validade)->isFuture();
    }
}

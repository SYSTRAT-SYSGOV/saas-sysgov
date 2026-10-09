<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Documento técnico anexado a um processo de licenciamento (ex.: EIA/RIMA) —
 * ver spec `meio-ambiente/licenciamento`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $processo_licenciamento_id
 * @property string $tipo
 * @property string|null $caminho_arquivo
 * @property \Illuminate\Support\Carbon $anexado_em
 */
final class DocumentoLicenciamento extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_documentos_licenciamento';

    public const TIPO_EIA_RIMA = 'EIA_RIMA';

    protected $fillable = [
        'tenant_id',
        'processo_licenciamento_id',
        'tipo',
        'caminho_arquivo',
        'anexado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'processo_licenciamento_id' => 'integer',
        'anexado_em' => 'datetime',
    ];

    /** @return BelongsTo<ProcessoLicenciamento, $this> */
    public function processoLicenciamento(): BelongsTo
    {
        return $this->belongsTo(ProcessoLicenciamento::class, 'processo_licenciamento_id');
    }
}

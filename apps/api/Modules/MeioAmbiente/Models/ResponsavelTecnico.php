<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Models\Pessoa;

/**
 * Responsável técnico habilitado (CREA/CRBio) por um empreendimento — exigido antes
 * da abertura de processo de licenciamento (ver spec `meio-ambiente/empreendimentos`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $empreendimento_id
 * @property int|null $pessoa_id
 * @property string $nome
 * @property string $registro_profissional
 * @property string $tipo_registro
 */
final class ResponsavelTecnico extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_responsaveis_tecnicos';

    public const TIPO_CREA = 'CREA';
    public const TIPO_CRBIO = 'CRBio';

    public const TIPOS_VALIDOS = [
        self::TIPO_CREA,
        self::TIPO_CRBIO,
    ];

    protected $fillable = [
        'tenant_id',
        'empreendimento_id',
        'pessoa_id',
        'nome',
        'registro_profissional',
        'tipo_registro',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'empreendimento_id' => 'integer',
        'pessoa_id' => 'integer',
    ];

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }
}

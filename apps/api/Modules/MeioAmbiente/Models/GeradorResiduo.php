<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Pessoas\Models\Pessoa;

/**
 * Gerador de resíduos sólidos (domiciliar, comercial ou industrial), com vínculo
 * opcional a uma pessoa física do Cadastro Único ou a um empreendimento — ver spec
 * `meio-ambiente/residuos-solidos`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string|null $nome
 * @property string $tipo
 * @property int|null $pessoa_id
 * @property int|null $empreendimento_id
 */
final class GeradorResiduo extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_geradores_residuo';

    public const TIPO_DOMICILIAR = 'domiciliar';
    public const TIPO_COMERCIAL = 'comercial';
    public const TIPO_INDUSTRIAL = 'industrial';

    public const TIPOS_VALIDOS = [
        self::TIPO_DOMICILIAR,
        self::TIPO_COMERCIAL,
        self::TIPO_INDUSTRIAL,
    ];

    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo',
        'pessoa_id',
        'empreendimento_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'empreendimento_id' => 'integer',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }

    /** @return HasMany<ColetaResiduo, $this> */
    public function coletas(): HasMany
    {
        return $this->hasMany(ColetaResiduo::class, 'gerador_residuo_id');
    }
}

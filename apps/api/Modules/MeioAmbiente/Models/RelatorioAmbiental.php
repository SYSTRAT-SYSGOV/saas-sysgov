<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Relatório ambiental obrigatório gerado para um exercício. `dados` é um retrato
 * (snapshot) congelado no momento da geração — a exportação usa sempre esse retrato,
 * nunca recalcula, para que o arquivo enviado ao órgão de controle seja reproduzível
 * mesmo que coletas/ocorrências do exercício sejam lançadas depois. Gerar de novo
 * cria outro registro (histórico), não sobrescreve o anterior.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo
 * @property int $exercicio
 * @property array<string, mixed> $dados
 * @property int|null $gerado_por
 * @property \Illuminate\Support\Carbon $created_at
 */
final class RelatorioAmbiental extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_relatorios';

    /** Relatório Anual de Resíduos Sólidos. */
    public const TIPO_RARS = 'rars';

    /** Inventário de emissões de Gases de Efeito Estufa. */
    public const TIPO_GEE = 'gee';

    public const TIPOS_VALIDOS = [
        self::TIPO_RARS,
        self::TIPO_GEE,
    ];

    public const FORMATO_CSV = 'csv';
    public const FORMATO_JSON = 'json';
    public const FORMATO_PDF = 'pdf';

    public const FORMATOS_VALIDOS = [
        self::FORMATO_CSV,
        self::FORMATO_JSON,
        self::FORMATO_PDF,
    ];

    protected $fillable = [
        'tenant_id',
        'tipo',
        'exercicio',
        'dados',
        'gerado_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'exercicio' => 'integer',
        'dados' => 'array',
        'gerado_por' => 'integer',
    ];

    /** @return BelongsTo<User, $this> */
    public function geradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gerado_por');
    }
}

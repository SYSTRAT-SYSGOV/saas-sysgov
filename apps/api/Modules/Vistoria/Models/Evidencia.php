<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Evidência fotográfica (resposta de pergunta tipo `foto` do checklist) ou documento
 * complementar (nota fiscal/licença/laudo apresentado pelo fiscalizado), vinculada à
 * execução de vistoria que a coletou.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $execucao_id
 * @property int|null $pergunta_id
 * @property string $tipo
 * @property string|null $categoria
 * @property string|null $descricao
 * @property string $caminho_original
 * @property string|null $caminho_processado
 * @property string|null $mime_type
 * @property int|null $tamanho_bytes
 * @property float|null $latitude
 * @property float|null $longitude
 * @property \Illuminate\Support\Carbon|null $capturado_em_dispositivo
 */
final class Evidencia extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_evidencias';

    public const TIPO_FOTO = 'foto';
    public const TIPO_DOCUMENTO_COMPLEMENTAR = 'documento_complementar';

    public const CATEGORIA_NOTA_FISCAL = 'nota_fiscal';
    public const CATEGORIA_LICENCA = 'licenca';
    public const CATEGORIA_LAUDO = 'laudo';
    public const CATEGORIA_OUTRO = 'outro';

    public const CATEGORIAS_VALIDAS = [
        self::CATEGORIA_NOTA_FISCAL,
        self::CATEGORIA_LICENCA,
        self::CATEGORIA_LAUDO,
        self::CATEGORIA_OUTRO,
    ];

    protected $fillable = [
        'tenant_id',
        'execucao_id',
        'pergunta_id',
        'tipo',
        'categoria',
        'descricao',
        'caminho_original',
        'caminho_processado',
        'mime_type',
        'tamanho_bytes',
        'latitude',
        'longitude',
        'capturado_em_dispositivo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'execucao_id' => 'integer',
        'pergunta_id' => 'integer',
        'tamanho_bytes' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'capturado_em_dispositivo' => 'datetime',
    ];

    /** @return BelongsTo<ExecucaoVistoria, $this> */
    public function execucao(): BelongsTo
    {
        return $this->belongsTo(ExecucaoVistoria::class, 'execucao_id');
    }

    /** @return BelongsTo<Pergunta, $this> */
    public function pergunta(): BelongsTo
    {
        return $this->belongsTo(Pergunta::class, 'pergunta_id');
    }
}

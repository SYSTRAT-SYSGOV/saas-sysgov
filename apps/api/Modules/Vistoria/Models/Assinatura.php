<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Assinatura (ou recusa) coletada em tela, vinculada a um documento de fiscalização.
 * Idempotente por `client_uuid` — a mesma coleta offline pode ser reenviada sem duplicar.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $documento_id
 * @property int|null $testemunha_pessoa_id
 * @property string $client_uuid
 * @property string $papel
 * @property string $status
 * @property array<int, mixed>|null $tracado_vetorial
 * @property string|null $imagem_path
 * @property string|null $hash_sha256
 * @property string|null $motivo_recusa
 * @property float|null $latitude
 * @property float|null $longitude
 * @property \Illuminate\Support\Carbon|null $coletado_em_dispositivo
 * @property \Illuminate\Support\Carbon|null $assinado_em
 */
final class Assinatura extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_assinaturas';

    public const PAPEL_AUTUADO = 'autuado';
    public const PAPEL_RESPONSAVEL = 'responsavel';
    public const PAPEL_TESTEMUNHA = 'testemunha';

    public const PAPEIS_VALIDOS = [self::PAPEL_AUTUADO, self::PAPEL_RESPONSAVEL, self::PAPEL_TESTEMUNHA];

    public const STATUS_ASSINADA = 'assinada';
    public const STATUS_RECUSADA = 'recusada';

    protected $fillable = [
        'tenant_id',
        'documento_id',
        'testemunha_pessoa_id',
        'client_uuid',
        'papel',
        'status',
        'tracado_vetorial',
        'imagem_path',
        'hash_sha256',
        'motivo_recusa',
        'latitude',
        'longitude',
        'coletado_em_dispositivo',
        'assinado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'documento_id' => 'integer',
        'testemunha_pessoa_id' => 'integer',
        'tracado_vetorial' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'coletado_em_dispositivo' => 'datetime',
        'assinado_em' => 'datetime',
    ];

    /** @return BelongsTo<Documento, $this> */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function testemunha(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'testemunha_pessoa_id');
    }
}

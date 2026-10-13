<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Processo administrativo sancionatório, aberto automaticamente ao emitir um auto de
 * infração (`DocumentoService::emitirDocumento()` com `tipo=auto_infracao`).
 *
 * Máquina de estados (ver `TRANSICOES_VALIDAS`): `aberto` → `em_defesa` (defesa apresentada)
 * **ou** `em_julgamento` (revelia — prazo de defesa vencido sem manifestação, via
 * `VerificarPrazosProcessoJob`) → `penalidade_aplicada`/`arquivado` (julgamento) →
 * `em_recurso` (recurso apresentado) ou `concluido` direto (revelia do recurso) →
 * `concluido` (recurso julgado).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $documento_id
 * @property string $status
 * @property \Illuminate\Support\Carbon $prazo_defesa_limite
 * @property string|null $defesa_texto
 * @property \Illuminate\Support\Carbon|null $defesa_apresentada_em
 * @property string|null $julgamento_decisao
 * @property string|null $julgamento_fundamentacao
 * @property int|null $penalidade_centavos
 * @property \Illuminate\Support\Carbon|null $julgado_em
 * @property int|null $julgado_por
 * @property \Illuminate\Support\Carbon|null $prazo_recurso_limite
 * @property string|null $recurso_texto
 * @property \Illuminate\Support\Carbon|null $recurso_apresentado_em
 * @property string|null $recurso_decisao
 * @property string|null $recurso_fundamentacao
 * @property \Illuminate\Support\Carbon|null $recurso_decidido_em
 * @property int|null $recurso_decidido_por
 * @property \Illuminate\Support\Carbon|null $concluido_em
 */
final class ProcessoSancionatorio extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_processos_sancionatorios';

    public const STATUS_ABERTO = 'aberto';
    public const STATUS_EM_DEFESA = 'em_defesa';
    public const STATUS_EM_JULGAMENTO = 'em_julgamento';
    public const STATUS_PENALIDADE_APLICADA = 'penalidade_aplicada';
    public const STATUS_ARQUIVADO = 'arquivado';
    public const STATUS_EM_RECURSO = 'em_recurso';
    public const STATUS_CONCLUIDO = 'concluido';

    public const DECISAO_PROCEDENTE = 'procedente';
    public const DECISAO_IMPROCEDENTE = 'improcedente';

    public const RECURSO_PROVIDO = 'provido';
    public const RECURSO_IMPROVIDO = 'improvido';

    /**
     * `em_defesa` (defesa apresentada) e `em_julgamento` (revelia da defesa) são as duas
     * formas de chegar a um julgamento — a partir daí o fluxo é o mesmo para ambas.
     *
     * @var array<string, list<string>>
     */
    public const TRANSICOES_VALIDAS = [
        self::STATUS_ABERTO => [self::STATUS_EM_DEFESA, self::STATUS_EM_JULGAMENTO],
        self::STATUS_EM_DEFESA => [self::STATUS_PENALIDADE_APLICADA, self::STATUS_ARQUIVADO],
        self::STATUS_EM_JULGAMENTO => [self::STATUS_PENALIDADE_APLICADA, self::STATUS_ARQUIVADO],
        self::STATUS_PENALIDADE_APLICADA => [self::STATUS_EM_RECURSO, self::STATUS_CONCLUIDO],
        self::STATUS_EM_RECURSO => [self::STATUS_CONCLUIDO],
        self::STATUS_ARQUIVADO => [],
        self::STATUS_CONCLUIDO => [],
    ];

    protected $fillable = [
        'tenant_id',
        'documento_id',
        'status',
        'prazo_defesa_limite',
        'defesa_texto',
        'defesa_apresentada_em',
        'julgamento_decisao',
        'julgamento_fundamentacao',
        'penalidade_centavos',
        'julgado_em',
        'julgado_por',
        'prazo_recurso_limite',
        'recurso_texto',
        'recurso_apresentado_em',
        'recurso_decisao',
        'recurso_fundamentacao',
        'recurso_decidido_em',
        'recurso_decidido_por',
        'concluido_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'documento_id' => 'integer',
        'prazo_defesa_limite' => 'date',
        'defesa_apresentada_em' => 'datetime',
        'penalidade_centavos' => 'integer',
        'julgado_em' => 'datetime',
        'julgado_por' => 'integer',
        'prazo_recurso_limite' => 'date',
        'recurso_apresentado_em' => 'datetime',
        'recurso_decidido_em' => 'datetime',
        'recurso_decidido_por' => 'integer',
        'concluido_em' => 'datetime',
    ];

    /** @return BelongsTo<Documento, $this> */
    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class, 'documento_id');
    }

    /** @return BelongsTo<User, $this> */
    public function julgadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'julgado_por');
    }

    /** @return BelongsTo<User, $this> */
    public function recursoDecididoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recurso_decidido_por');
    }
}

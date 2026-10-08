<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Processo de licenciamento ambiental de um empreendimento, por fase (LP/LI/LO/
 * renovação/correção) — ver spec `meio-ambiente/licenciamento`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $empreendimento_id
 * @property string $fase
 * @property string $numero
 * @property int $numero_sequencial
 * @property int $exercicio
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $data_deferimento
 * @property \Illuminate\Support\Carbon|null $validade_em
 */
final class ProcessoLicenciamento extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_processos_licenciamento';

    public const FASE_LP = 'LP';
    public const FASE_LI = 'LI';
    public const FASE_LO = 'LO';
    public const FASE_RENOVACAO = 'renovacao';
    public const FASE_CORRECAO = 'correcao';

    public const FASES_VALIDAS = [
        self::FASE_LP,
        self::FASE_LI,
        self::FASE_LO,
        self::FASE_RENOVACAO,
        self::FASE_CORRECAO,
    ];

    /** Ordem de progressão das fases "principais" — usada para localizar a fase anterior (condicionantes). */
    public const ORDEM_FASES_PRINCIPAIS = [self::FASE_LP, self::FASE_LI, self::FASE_LO];

    public const STATUS_EM_ANALISE = 'em_analise';
    public const STATUS_DEFERIDO = 'deferido';
    public const STATUS_INDEFERIDO = 'indeferido';

    /** Validade padrão (dias) por fase, contada a partir do deferimento — parametrização inicial, ver design.md. */
    public const VALIDADE_DIAS_POR_FASE = [
        self::FASE_LP => 180,
        self::FASE_LI => 365,
        self::FASE_LO => 1825,
        self::FASE_RENOVACAO => 1825,
        self::FASE_CORRECAO => 365,
    ];

    protected $fillable = [
        'tenant_id',
        'empreendimento_id',
        'fase',
        'numero',
        'numero_sequencial',
        'exercicio',
        'status',
        'data_deferimento',
        'validade_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'empreendimento_id' => 'integer',
        'numero_sequencial' => 'integer',
        'exercicio' => 'integer',
        'data_deferimento' => 'date',
        'validade_em' => 'date',
    ];

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }

    /** @return HasMany<DocumentoLicenciamento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(DocumentoLicenciamento::class, 'processo_licenciamento_id');
    }

    /** @return HasMany<Condicionante, $this> */
    public function condicionantes(): HasMany
    {
        return $this->hasMany(Condicionante::class, 'processo_licenciamento_id');
    }

    /** @return HasMany<VistoriaTecnicaLicenciamento, $this> */
    public function vistoriasTecnicas(): HasMany
    {
        return $this->hasMany(VistoriaTecnicaLicenciamento::class, 'processo_licenciamento_id');
    }

    public function ultimaVistoriaTecnica(): ?VistoriaTecnicaLicenciamento
    {
        return $this->vistoriasTecnicas()->latest('realizada_em')->first();
    }

    public function temCondicionantePendenteVencida(): bool
    {
        return $this->condicionantes()
            ->where('situacao', Condicionante::SITUACAO_PENDENTE)
            ->where('prazo', '<', today())
            ->exists();
    }

    public function estaVencido(): bool
    {
        return $this->status === self::STATUS_DEFERIDO
            && $this->validade_em !== null
            && $this->validade_em->isPast();
    }
}

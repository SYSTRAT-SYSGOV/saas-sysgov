<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Documento de fiscalização (auto de infração, notificação, termo de embargo/apreensão)
 * emitido a partir de uma execução de vistoria, com numeração sequencial única por
 * tipo/exercício e PDF gerado e armazenado no momento da emissão.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $execucao_id
 * @property int|null $autuado_pessoa_id
 * @property string $tipo
 * @property string $numero
 * @property int $numero_sequencial
 * @property int $exercicio
 * @property string|null $irregularidade
 * @property string|null $enquadramento_legal
 * @property int|null $prazo_dias
 * @property \Illuminate\Support\Carbon|null $prazo_limite
 * @property array<string, mixed>|null $dados_autuado criptografado em repouso (contém CPF do autuado — LGPD)
 * @property string|null $caminho_pdf
 * @property string $assinatura_status
 */
final class Documento extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_documentos';

    public const TIPO_AUTO_INFRACAO = 'auto_infracao';
    public const TIPO_NOTIFICACAO = 'notificacao';
    public const TIPO_TERMO_EMBARGO = 'termo_embargo';
    public const TIPO_TERMO_APREENSAO = 'termo_apreensao';

    public const TIPOS_VALIDOS = [
        self::TIPO_AUTO_INFRACAO,
        self::TIPO_NOTIFICACAO,
        self::TIPO_TERMO_EMBARGO,
        self::TIPO_TERMO_APREENSAO,
    ];

    public const ASSINATURA_PENDENTE = 'pendente';
    public const ASSINATURA_ASSINADA = 'assinada';
    public const ASSINATURA_RECUSADA = 'recusada';

    protected $fillable = [
        'tenant_id',
        'execucao_id',
        'autuado_pessoa_id',
        'tipo',
        'numero',
        'numero_sequencial',
        'exercicio',
        'irregularidade',
        'enquadramento_legal',
        'prazo_dias',
        'prazo_limite',
        'dados_autuado',
        'caminho_pdf',
        'assinatura_status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'execucao_id' => 'integer',
        'autuado_pessoa_id' => 'integer',
        'numero_sequencial' => 'integer',
        'exercicio' => 'integer',
        'prazo_dias' => 'integer',
        'prazo_limite' => 'date',
        // Criptografado em repouso (contém o CPF do autuado) — mesmo padrão de
        // Modules\Pessoas\Models\Pessoa::$cpf e Modules\Cemiterios\Models\Falecido::$docs_medicos.
        'dados_autuado' => 'encrypted:array',
    ];

    /** @return BelongsTo<ExecucaoVistoria, $this> */
    public function execucao(): BelongsTo
    {
        return $this->belongsTo(ExecucaoVistoria::class, 'execucao_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function autuado(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'autuado_pessoa_id');
    }

    /** @return HasMany<Assinatura, $this> */
    public function assinaturas(): HasMany
    {
        return $this->hasMany(Assinatura::class, 'documento_id');
    }

    /** @return HasOne<ProcessoSancionatorio, $this> */
    public function processoSancionatorio(): HasOne
    {
        return $this->hasOne(ProcessoSancionatorio::class, 'documento_id');
    }

    /** @return HasOne<Reinspecao, $this> */
    public function reinspecao(): HasOne
    {
        return $this->hasOne(Reinspecao::class, 'documento_id');
    }
}

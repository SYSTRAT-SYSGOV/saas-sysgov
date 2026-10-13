<?php

declare(strict_types=1);

namespace Modules\Protocolo\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $numero
 * @property int $ano
 * @property string $assunto
 * @property string $origem
 * @property int $orgao_origem_id
 * @property int $orgao_atual_id
 * @property int|null $interessado_pessoa_id
 * @property int|null $processo_pai_id
 * @property string $status
 * @property int|null $ultimo_andamento_id
 * @property \Illuminate\Support\Carbon $data_abertura
 * @property \Illuminate\Support\Carbon|null $data_conclusao
 * @property int|null $created_by
 * @property-read string $numero_formatado
 */
final class Processo extends Model
{
    use TenantAware;
    use HasFactory;
    use SoftDeletes;

    protected $table = 'protocolo_processos';

    protected $appends = [
        'numero_formatado',
    ];

    protected $fillable = [
        'tenant_id',
        'numero',
        'ano',
        'assunto',
        'origem',
        'orgao_origem_id',
        'orgao_atual_id',
        'interessado_pessoa_id',
        'processo_pai_id',
        'status',
        'ultimo_andamento_id',
        'data_abertura',
        'data_conclusao',
        'created_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'numero' => 'integer',
        'ano' => 'integer',
        'orgao_origem_id' => 'integer',
        'orgao_atual_id' => 'integer',
        'interessado_pessoa_id' => 'integer',
        'processo_pai_id' => 'integer',
        'ultimo_andamento_id' => 'integer',
        'data_abertura' => 'datetime',
        'data_conclusao' => 'datetime',
        'created_by' => 'integer',
    ];

    public function getNumeroFormatadoAttribute(): string
    {
        return str_pad((string) $this->numero, 4, '0', STR_PAD_LEFT) . '/' . $this->ano;
    }

    public function orgaoOrigem(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'orgao_origem_id');
    }

    public function orgaoAtual(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'orgao_atual_id');
    }

    public function interessado(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'interessado_pessoa_id');
    }

    public function processoPai(): BelongsTo
    {
        return $this->belongsTo(self::class, 'processo_pai_id');
    }

    public function filhos(): HasMany
    {
        return $this->hasMany(self::class, 'processo_pai_id');
    }

    public function andamentos(): HasMany
    {
        return $this->hasMany(Andamento::class, 'processo_id')->orderBy('sequencia');
    }

    public function andamentoAtual(): HasOne
    {
        return $this->hasOne(Andamento::class, 'processo_id')->where('and_atual', true);
    }

    public function ultimoAndamento(): BelongsTo
    {
        return $this->belongsTo(Andamento::class, 'ultimo_andamento_id');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(Documento::class, 'processo_id');
    }

    public function atributos(): HasMany
    {
        return $this->hasMany(Atributo::class, 'processo_id');
    }

    public function vinculos(): HasMany
    {
        return $this->hasMany(Vinculo::class, 'processo_id');
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

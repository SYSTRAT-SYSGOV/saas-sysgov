<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Cemiterios\Support\Parentesco;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $sucessao_id
 * @property int|null $pessoa_id
 * @property string $nome
 * @property Parentesco $parentesco
 * @property string|null $documento
 * @property int $ordem
 * @property bool $direito_representacao
 * @property bool $titular_indicado
 * @property int|null $herdeiro_representado_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Modules\Pessoas\Models\Pessoa|null $pessoa
 */
final class SucessaoHerdeiro extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'sucessao_herdeiros';

    protected $guarded = ['id', 'tenant_id'];

    /** A pessoa é a fonte do documento: vem junto, sem consulta por herdeiro, e nunca sai inteira na resposta. */
    protected $with = ['pessoa'];

    /** @var list<string> */
    protected $hidden = ['pessoa'];

    protected $casts = [
        'parentesco' => Parentesco::class,
        'ordem' => 'integer',
        'direito_representacao' => 'boolean',
        'titular_indicado' => 'boolean',
    ];

    /** @return BelongsTo<Sucessao, $this> */
    public function sucessao(): BelongsTo
    {
        return $this->belongsTo(Sucessao::class, 'sucessao_id');
    }

    /**
     * Documento completo para regra de negócio (criar ou achar o novo titular): o da pessoa do cadastro central; sem
     * pessoa, ou com documento pendente, a cópia local. Quem escolhe uma pessoa no seletor deixa na cópia o CPF
     * mascarado, que não serve para identificar ninguém.
     */
    public function documentoDaPessoa(): ?string
    {
        if ($this->pessoa !== null && ! $this->pessoa->documento_pendente) {
            // Documento ilegível (chave trocada ou dado corrompido): cai na cópia local.
            $documento = rescue(fn (): string => (string) $this->pessoa->documento, '', false);
            if ($documento !== '') {
                return $documento;
            }
        }

        return $this->documento;
    }

    /**
     * No JSON, o `documento` de quem tem pessoa é o CPF/CNPJ mascarado dela, o mesmo que o seletor de pessoas já
     * grava na cópia; a relação em si não sai. Sem pessoa, ou com documento pendente, vale a cópia local.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $dados = parent::toArray();
        if ($this->pessoa !== null && ! $this->pessoa->documento_pendente) {
            $dados['documento'] = $this->pessoa->cpf_mascarado;
        }

        return $dados;
    }

    /** @return BelongsTo<SucessaoHerdeiro, $this> */
    public function herdeiroRepresentado(): BelongsTo
    {
        return $this->belongsTo(SucessaoHerdeiro::class, 'herdeiro_representado_id');
    }

    /** @return BelongsTo<\Modules\Pessoas\Models\Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(\Modules\Pessoas\Models\Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<SucessaoHerdeiro, $this> */
    public function representados(): HasMany
    {
        return $this->hasMany(SucessaoHerdeiro::class, 'herdeiro_representado_id');
    }
}
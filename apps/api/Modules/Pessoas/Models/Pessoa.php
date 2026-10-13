<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Database\Factories\PessoaFactory;
use Modules\Pessoas\Events\PessoaAtualizada;
use Modules\Pessoas\Support\Documento;

/**
 * Cadastro único de pessoa física ou jurídica por tenant (MDM).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo
 * @property string $documento
 * @property string $documento_hash
 * @property string $nome
 * @property string|null $nome_social
 * @property string|null $razao_social
 * @property string|null $nome_fantasia
 * @property string|null $inscricao_estadual
 * @property string|null $inscricao_municipal
 * @property string|null $porte
 * @property string|null $natureza_juridica
 * @property int|null $responsavel_id
 * @property \Illuminate\Support\Carbon|null $data_nascimento
 * @property string|null $sexo
 * @property string|null $nome_mae
 * @property string|null $nome_pai
 * @property string|null $estado_civil
 * @property string|null $nacionalidade
 * @property string|null $naturalidade
 * @property string|null $nis
 * @property string $status
 * @property bool $falecido
 * @property \Illuminate\Support\Carbon|null $data_falecimento
 * @property string|null $certidao_obito_numero
 * @property string|null $cartorio_obito
 * @property string|null $observacao_obito
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $documento_mascarado
 * @property-read string $cpf_mascarado
 */
final class Pessoa extends Model
{
    /** @use HasFactory<PessoaFactory> */
    use HasFactory;
    use TenantAware;
    use SoftDeletes;

    protected static function newFactory(): PessoaFactory
    {
        return PessoaFactory::new();
    }

    protected $table = 'pessoas';

    /** Espelha o DEFAULT 'fisica' da coluna no banco — necessário para que uma instância
     *  recém-criada sem `tipo` explícito já reflita o tipo correto em memória, sem exigir
     *  um refresh() após o insert (ex.: PromocaoUsuarioService::promover() checando o tipo
     *  logo após Pessoa::create() sem informar `tipo`). */
    protected $attributes = ['tipo' => 'fisica'];

    protected $guarded = ['id', 'tenant_id', 'documento_hash'];

    protected $hidden = ['documento', 'documento_hash'];

    protected $appends = ['documento_mascarado', 'cpf_mascarado'];

    protected $casts = [
        'documento' => 'encrypted',
        'nome_mae' => 'encrypted',
        'nome_pai' => 'encrypted',
        'nis' => 'encrypted',
        'data_nascimento' => 'date',
        'falecido' => 'boolean',
        'data_falecimento' => 'date',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $pessoa): void {
            $pessoa->documento = Documento::somenteDigitos((string) $pessoa->documento);
            $pessoa->documento_hash = Documento::hash($pessoa->documento);
            if ($pessoa->falecido && $pessoa->status === 'ativo') {
                $pessoa->status = 'falecido';
            }
            // `nome` é NOT NULL e serve de rótulo genérico de exibição (ex.: PessoaPicker);
            // para jurídica, espelha a razão social, sem precisar de campo extra no Resource.
            if ($pessoa->tipo === 'juridica' && $pessoa->razao_social) {
                $pessoa->nome = $pessoa->razao_social;
            }
        });

        // Consumidores (Escola, Cursos…) mantêm cópias de exibição: avisa quando dado civil muda.
        static::updated(function (self $pessoa): void {
            $alterados = array_values(array_filter(PessoaAtualizada::CAMPOS, fn (string $c): bool => $pessoa->wasChanged($c)));
            if ($alterados !== []) {
                PessoaAtualizada::dispatch($pessoa->id, (int) $pessoa->tenant_id, $alterados);
            }
        });
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeFalecidos(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('falecido', true);
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeVivos(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('falecido', false);
    }

    public function getDocumentoMascaradoAttribute(): string
    {
        try {
            return Documento::mascarar((string) $this->documento);
        } catch (\Throwable) {
            return '—';
        }
    }

    /** Alias de compatibilidade — contrato de API existente para pessoa física. */
    public function getCpfMascaradoAttribute(): string
    {
        return $this->getDocumentoMascaradoAttribute();
    }

    /** Alias de compatibilidade para escrita: mapeia 'cpf' para 'documento'. */
    public function setCpfAttribute(?string $value): void
    {
        $this->setAttribute('documento', $value);
        if (!isset($this->attributes['tipo'])) {
            $this->attributes['tipo'] = 'fisica';
        }
    }

    /** Alias de compatibilidade para leitura: devolve 'documento'. */
    public function getCpfAttribute(): ?string
    {
        return $this->getAttribute('documento');
    }

    /** @return HasMany<PessoaVinculo, $this> */
    public function vinculos(): HasMany
    {
        return $this->hasMany(PessoaVinculo::class);
    }

    /** @return HasMany<PessoaSocio, $this> */
    public function socios(): HasMany
    {
        return $this->hasMany(PessoaSocio::class, 'pessoa_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(self::class, 'responsavel_id');
    }

    /** @return HasMany<PessoaDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(PessoaDocumento::class);
    }

    /** @return HasMany<PessoaEndereco, $this> */
    public function enderecos(): HasMany
    {
        return $this->hasMany(PessoaEndereco::class);
    }

    /** @return HasMany<PessoaContato, $this> */
    public function contatos(): HasMany
    {
        return $this->hasMany(PessoaContato::class);
    }

    /** @return HasOne<PessoaUsuario, $this> */
    public function usuario(): HasOne
    {
        return $this->hasOne(PessoaUsuario::class);
    }
}

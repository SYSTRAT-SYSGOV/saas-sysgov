<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Modules\Cemiterios\Support\Documento;

/**
 * Titular de concessão (RN-05: proteção integral LGPD). Autentica-se no portal
 * pelo Gov.br e recebe token Sanctum próprio (guard do portal).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $pessoa_id
 * @property string $nome
 * @property string $tipo_doc
 * @property string $documento
 * @property string $documento_hash
 * @property string|null $email
 * @property string|null $telefone
 * @property string|null $endereco
 * @property string|null $cep
 * @property string|null $logradouro
 * @property string|null $numero
 * @property string|null $complemento
 * @property string|null $bairro
 * @property string|null $cidade
 * @property string|null $uf
 * @property string $base_legal
 * @property bool $titular_falecido
 * @property \Illuminate\Support\Carbon|null $data_falecimento_titular
 * @property string|null $processo_inventario
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read string $documento_mascarado
 * @property-read \Modules\Pessoas\Models\Pessoa|null $pessoa
 */
final class Concessionario extends Model
{
    use TenantAware;
    use SoftDeletes;
    use HasApiTokens;

    protected $table = 'concession_holders';

    protected $guarded = ['id', 'tenant_id', 'documento_hash'];

    protected $hidden = ['documento', 'documento_hash'];

    protected $appends = ['documento_mascarado', 'documento_desmascarado'];

    protected $casts = [
        'documento' => 'encrypted',
        'email' => 'encrypted',
        'telefone' => 'encrypted',
        'titular_falecido' => 'boolean',
        'data_falecimento_titular' => 'date',
        'contatos_adicionais' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $holder): void {
            if ($holder->pessoa_id) {
                $pessoa = $holder->pessoa ?: \Modules\Pessoas\Models\Pessoa::find($holder->pessoa_id);
                if ($pessoa) {
                    $holder->documento = (string) $pessoa->documento;
                    $holder->documento_hash = (string) $pessoa->documento_hash;
                }
            } else {
                $holder->documento = Documento::somenteDigitos((string) $holder->documento);
                $holder->documento_hash = Documento::hash($holder->documento);
            }

            // Compor endereço textual unificado se os campos estruturados estiverem preenchidos
            if (!empty($holder->logradouro)) {
                $partes = [
                    $holder->logradouro . (!empty($holder->numero) ? ", {$holder->numero}" : ', s/n'),
                    $holder->complemento,
                    $holder->bairro,
                    (!empty($holder->cidade) ? $holder->cidade : '') . (!empty($holder->uf) ? "/{$holder->uf}" : ''),
                    !empty($holder->cep) ? "CEP {$holder->cep}" : '',
                ];
                $holder->endereco = implode(' - ', array_filter(array_map(fn ($parte) => trim((string) $parte), $partes)));
            }
        });
    }

    /** CPF/CNPJ mascarado nas listagens padrão. */
    public function getDocumentoMascaradoAttribute(): string
    {
        if ($this->pessoa_id && $this->pessoa) {
            return $this->pessoa->cpf_mascarado;
        }
        try {
            return Documento::mascarar((string) $this->documento);
        } catch (\Throwable) {
            return '—';
        }
    }

    /** CPF/CNPJ completo desmascarado para gestores administrativos autorizados. */
    public function getDocumentoDesmascaradoAttribute(): string
    {
        if ($this->pessoa_id && $this->pessoa) {
            return (string) $this->pessoa->documento;
        }

        return (string) $this->documento;
    }

    /** @return \Illuminate\Database\Eloquent\Relations\BelongsTo<\Modules\Pessoas\Models\Pessoa, $this> */
    public function pessoa(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\Modules\Pessoas\Models\Pessoa::class, 'pessoa_id');
    }

    /** @return HasMany<Concessao, $this> */
    public function concessoes(): HasMany
    {
        return $this->hasMany(Concessao::class, 'holder_id');
    }
}

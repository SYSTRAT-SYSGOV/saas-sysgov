<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Inservivel\Enums\StatusEntidade;

/**
 * Entidade sem fins lucrativos (spec: Entidades sem fins lucrativos; D6). O CPF do representante fica
 * criptografado e nunca sai completo na API.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $user_id
 * @property string $razao_social
 * @property string $nome_fantasia
 * @property string $cnpj
 * @property string $email
 * @property string $cpf_representante
 * @property StatusEntidade $status
 * @property string|null $motivo_reprovacao
 * @property int $lotes_ganhos
 */
final class Entidade extends Model
{
    use TenantAware;

    protected $table = 'inservivel_entidades';

    protected $fillable = [
        'tenant_id', 'user_id', 'razao_social', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 'inscricao_municipal',
        'endereco', 'cep', 'cidade', 'uf', 'telefone', 'celular', 'email', 'representante_legal', 'cpf_representante',
        'rg_representante', 'cargo_representante', 'tempo_funcionamento_anos', 'area_atuacao', 'finalidade',
        'numero_beneficiarios', 'certificacoes', 'banco', 'agencia', 'conta', 'chave_pix', 'status', 'motivo_reprovacao',
        'lotes_ganhos',
    ];

    protected $hidden = ['cpf_representante'];

    protected $casts = [
        'tenant_id' => 'integer',
        'user_id' => 'integer',
        'cpf_representante' => 'encrypted',
        'status' => StatusEntidade::class,
        'tempo_funcionamento_anos' => 'integer',
        'numero_beneficiarios' => 'integer',
        'lotes_ganhos' => 'integer',
    ];

    protected $attributes = ['status' => 'pendente', 'lotes_ganhos' => 0];

    public function cpfMascarado(): string
    {
        $cpf = (string) $this->cpf_representante;

        return strlen($cpf) === 11 ? '***.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-**' : '';
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<EntidadeDocumento, $this> */
    public function documentos(): HasMany
    {
        return $this->hasMany(EntidadeDocumento::class, 'entidade_id');
    }

    /** @return HasMany<Interesse, $this> */
    public function interesses(): HasMany
    {
        return $this->hasMany(Interesse::class, 'entidade_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Pessoa inscrita em cursos. Na Fase 1 é sempre um servidor com login
 * (user_id preenchido); user_id nulo fica reservado ao participante
 * externo da Fase 3 (design D2).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $user_id
 * @property int|null $pessoa_id pessoa do Cadastro de Pessoas (só pessoa física com CPF)
 * @property string $nome
 * @property string|null $email nulo só em participante emitido à mão sem e-mail (certificado avulso)
 * @property string|null $documento
 * @property int|null $empresa_id empresa da biblioteca do órgão ({EMPRESA}/{CNPJ} no certificado)
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User|null $user
 */
final class Participante extends Model
{
    use TenantAware;

    protected $table = 'cursos_participantes';

    protected $fillable = ['tenant_id', 'user_id', 'pessoa_id', 'empresa_id', 'nome', 'email', 'documento'];

    protected $casts = [
        'tenant_id' => 'integer',
        'user_id' => 'integer',
        'empresa_id' => 'integer',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<Inscricao, $this> */
    public function inscricoes(): HasMany
    {
        return $this->hasMany(Inscricao::class, 'participante_id');
    }

    /** @return BelongsTo<Empresa, $this> */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** CPF com máscara (000.000.000-00) para {CPF}: o documento, se for CPF, senão o da pessoa ligada. */
    public function cpfFormatado(): string
    {
        $cpf = strlen((string) $this->documento) === 11 ? (string) $this->documento : '';
        if ($cpf === '' && $this->pessoa_id !== null) {
            try {
                $cpf = Documento::somenteDigitos((string) $this->pessoa?->cpf);
            } catch (\Throwable) {
                // CPF ilegível (chave trocada ou dado corrompido): a emissão segue sem o CPF.
                $cpf = '';
            }
        }

        return strlen($cpf) === 11 ? vsprintf('%s.%s.%s-%s', [substr($cpf, 0, 3), substr($cpf, 3, 3), substr($cpf, 6, 3), substr($cpf, 9, 2)]) : '';
    }
}

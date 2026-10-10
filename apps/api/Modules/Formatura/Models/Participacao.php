<?php

declare(strict_types=1);

namespace Modules\Formatura\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Domain\CalculadoraValorDevido;

/**
 * Adesão de um aluno (do cadastro Escola) à formatura de um ano.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $configuracao_id
 * @property int $aluno_id
 * @property bool $participa
 * @property int $convidados_incluidos
 * @property int $convidados_extras
 * @property string|null $observacoes
 * @property-read Configuracao|null $configuracao
 * @property-read Aluno|null $aluno
 */
final class Participacao extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'formatura_participacoes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'configuracao_id', 'aluno_id', 'participa', 'convidados_incluidos', 'convidados_extras', 'observacoes'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'configuracao_id' => 'integer', 'aluno_id' => 'integer', 'participa' => 'boolean',
        'convidados_incluidos' => 'integer', 'convidados_extras' => 'integer',
    ];

    public function valorDevidoCentavos(Configuracao $configuracao): int
    {
        return CalculadoraValorDevido::calcular(
            $configuracao->tipoCalculo(),
            $configuracao->valor_base_centavos,
            $configuracao->valor_pessoa_extra_centavos,
            $this->participa,
            $this->totalConvidados(),
        )->cents;
    }

    /** Número único de convidados (D16): as duas colunas são somadas; a tela grava tudo em `convidados_extras`. */
    public function totalConvidados(): int
    {
        return $this->convidados_incluidos + $this->convidados_extras;
    }

    /** @return BelongsTo<Configuracao, $this> */
    public function configuracao(): BelongsTo
    {
        return $this->belongsTo(Configuracao::class, 'configuracao_id');
    }

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }

    /** @return HasMany<Pagamento, $this> */
    public function pagamentos(): HasMany
    {
        return $this->hasMany(Pagamento::class, 'participacao_id');
    }
}

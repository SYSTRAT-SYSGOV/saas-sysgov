<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Motorista: pessoa física do Cadastro de Pessoas (D4). CPF, nome e nascimento ficam lá; aqui só CNH, curso e
 * exame toxicológico. A elegibilidade (CTB, arts. 136 a 139) é calculada na leitura, nunca gravada.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property int|null $empresa_id
 * @property string $cnh_numero
 * @property string $cnh_categoria
 * @property \Illuminate\Support\Carbon|null $cnh_primeira_habilitacao
 * @property \Illuminate\Support\Carbon $cnh_validade
 * @property string|null $curso_certificado
 * @property \Illuminate\Support\Carbon|null $curso_validade
 * @property \Illuminate\Support\Carbon|null $toxicologico_data
 * @property \Illuminate\Support\Carbon|null $toxicologico_validade
 * @property bool $ativo
 * @property string|null $observacoes
 * @property-read Pessoa|null $pessoa
 * @property-read Empresa|null $empresa
 */
final class Motorista extends Model
{
    use SoftDeletes;
    use TenantAware;

    /** Idade mínima: o CTB exige idade superior a 21 anos. */
    public const IDADE_MINIMA = 21;

    protected $table = 'transporte_motoristas';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'pessoa_id', 'empresa_id', 'cnh_numero', 'cnh_categoria', 'cnh_primeira_habilitacao', 'cnh_validade',
        'curso_certificado', 'curso_validade', 'toxicologico_data', 'toxicologico_validade', 'ativo', 'observacoes',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'empresa_id' => 'integer',
        'cnh_primeira_habilitacao' => 'date',
        'cnh_validade' => 'date',
        'curso_validade' => 'date',
        'toxicologico_data' => 'date',
        'toxicologico_validade' => 'date',
        'ativo' => 'boolean',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return BelongsTo<Empresa, $this> */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class, 'empresa_id');
    }

    public function nome(): string
    {
        $pessoa = $this->pessoa;

        return (string) ($pessoa?->nome_social ?: $pessoa?->nome ?: "Motorista #{$this->id}");
    }

    /**
     * Motivos pelos quais o motorista não pode conduzir: `cnh_vencida`, `curso_ausente`, `curso_vencido`,
     * `toxicologico_ausente`, `toxicologico_vencido`, `nascimento_ausente` e `idade_minima`.
     *
     * @return list<string>
     */
    public function motivosInelegibilidade(): array
    {
        $hoje = today();
        $motivos = [];

        if ($this->cnh_validade->lt($hoje)) {
            $motivos[] = 'cnh_vencida';
        }
        if ($this->curso_validade === null) {
            $motivos[] = 'curso_ausente';
        } elseif ($this->curso_validade->lt($hoje)) {
            $motivos[] = 'curso_vencido';
        }
        if ($this->toxicologico_validade === null) {
            $motivos[] = 'toxicologico_ausente';
        } elseif ($this->toxicologico_validade->lt($hoje)) {
            $motivos[] = 'toxicologico_vencido';
        }

        $nascimento = $this->pessoa?->data_nascimento;
        if ($nascimento === null) {
            $motivos[] = 'nascimento_ausente';
        } elseif (!$nascimento->copy()->addYears(self::IDADE_MINIMA)->lt($hoje)) {
            $motivos[] = 'idade_minima';
        }

        return $motivos;
    }

    public function elegivel(): bool
    {
        return $this->motivosInelegibilidade() === [];
    }
}

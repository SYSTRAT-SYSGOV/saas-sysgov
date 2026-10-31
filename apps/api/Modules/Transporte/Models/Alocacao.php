<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;

/**
 * Aluno alocado em uma rota e uma parada. Ativa enquanto `data_fim` é nula; o histórico nunca é apagado.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $aluno_id
 * @property int $rota_id
 * @property int $parada_id
 * @property string $turno
 * @property bool $usa_transporte_rural
 * @property int|null $poder_publico
 * @property bool $necessidade_especial
 * @property string|null $necessidade_observacao dado sensível (D22): fora de listagens e exportações
 * @property bool $atendimento_curricular
 * @property string $mediacao_didatica
 * @property string $pais_residencia
 * @property \Illuminate\Support\Carbon $data_inicio
 * @property \Illuminate\Support\Carbon|null $data_fim
 * @property string|null $motivo_fim
 * @property string|null $justificativa_excesso
 * @property string|null $observacoes
 * @property-read Aluno|null $aluno
 * @property-read Parada|null $parada
 * @property-read Rota|null $rota
 */
final class Alocacao extends Model
{
    use TenantAware;

    protected $table = 'transporte_alocacoes';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'aluno_id', 'rota_id', 'parada_id', 'turno', 'usa_transporte_rural', 'poder_publico', 'necessidade_especial',
        'necessidade_observacao', 'atendimento_curricular', 'mediacao_didatica', 'pais_residencia', 'data_inicio', 'data_fim',
        'motivo_fim', 'justificativa_excesso', 'observacoes',
    ];

    /** @var list<string> */
    protected $hidden = ['necessidade_observacao'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer',
        'aluno_id' => 'integer',
        'rota_id' => 'integer',
        'parada_id' => 'integer',
        'usa_transporte_rural' => 'boolean',
        'poder_publico' => 'integer',
        'necessidade_especial' => 'boolean',
        'atendimento_curricular' => 'boolean',
        'data_inicio' => 'date',
        'data_fim' => 'date',
    ];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withoutGlobalScope('escola')->withTrashed();
    }

    /** @return BelongsTo<Parada, $this> */
    public function parada(): BelongsTo
    {
        return $this->belongsTo(Parada::class, 'parada_id');
    }

    /** @return BelongsTo<Rota, $this> */
    public function rota(): BelongsTo
    {
        return $this->belongsTo(Rota::class, 'rota_id')->withTrashed();
    }

    public function ativa(): bool
    {
        return $this->data_fim === null;
    }

    /**
     * Avisos que não bloqueiam (D20): `turno_divergente` quando o turno da turma é reconhecível e difere do da rota.
     *
     * @return list<string>
     */
    public function avisos(): array
    {
        $turmaTurno = \Modules\Transporte\Support\Turnos::normalizar((string) $this->aluno?->turma?->turno?->nome);

        return $turmaTurno !== null && $turmaTurno !== $this->turno ? ['turno_divergente'] : [];
    }
}

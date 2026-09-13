<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

/**
 * Modelo de Formulário de Avaliação (versionado, com vigência e grupos).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $codigo
 * @property string $nome
 * @property string|null $descricao
 * @property int|null $plano_carreira_id
 * @property string|null $cargo
 * @property int $versao
 * @property \Illuminate\Support\Carbon $vigencia_inicio
 * @property \Illuminate\Support\Carbon|null $vigencia_fim
 * @property array<string, array{nome: string, peso: float, ordem: int}>|null $grupos
 * @property bool $ativo
 */
final class ModeloFormulario extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_modelos_formulario';

    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'descricao',
        'plano_carreira_id',
        'cargo',
        'versao',
        'vigencia_inicio',
        'vigencia_fim',
        'grupos',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'         => 'integer',
        'plano_carreira_id' => 'integer',
        'versao'            => 'integer',
        'vigencia_inicio'   => 'date',
        'vigencia_fim'      => 'date',
        'grupos'            => 'array',
        'ativo'             => 'boolean',
    ];

    public function planoCarreira(): BelongsTo
    {
        return $this->belongsTo(PlanoCarreira::class, 'plano_carreira_id');
    }

    public function perguntas(): HasMany
    {
        return $this->hasMany(Pergunta::class, 'modelo_id')->orderBy('ordem');
    }

    public function perguntasAtivas(): HasMany
    {
        return $this->hasMany(Pergunta::class, 'modelo_id')
            ->where('ativo', true)
            ->orderBy('ordem');
    }

    /** RF-02: pesos configuráveis por formulário (pivot com FatorAvaliacao). */
    public function fatoresPesos(): HasMany
    {
        return $this->hasMany(ModeloFatorPeso::class, 'modelo_id')
            ->where('ativo', true)
            ->orderBy('ordem');
    }

    /** RF-02: todos os pesos (inclusive inativos), para gestão. */
    public function todosFatoresPesos(): HasMany
    {
        return $this->hasMany(ModeloFatorPeso::class, 'modelo_id')->orderBy('ordem');
    }

    /** RF-03: escala(s) gráfica(s) associadas ao formulário. */
    public function escalasGraficas(): HasMany
    {
        return $this->hasMany(EscalaGrafica::class, 'modelo_id');
    }

    /** RF-03: escala gráfica ativa do formulário. */
    public function escalaGraficaAtiva(): HasMany
    {
        return $this->hasMany(EscalaGrafica::class, 'modelo_id')->where('ativa', true);
    }

    // ── Helpers de validação ──────────────────────────────────────────

    /**
     * RF-02: verifica se a soma dos pesos ativos é exatamente 100%.
     * Retorna true se válido; false caso contrário.
     */
    public function validarSomaPesos(): bool
    {
        $soma = $this->fatoresPesos()->sum('peso');
        return abs($soma - 100.0) < 0.01;
    }

    /**
     * Retorna os fatores de avaliação com seus pesos configurados neste modelo,
     * aplicando redistribuição do fator H quando necessário (RF-06).
     *
     * @param bool $temAtendimentoPublico — quando false, redistribui peso redistribuivel
     * @return Collection<int, ModeloFatorPeso>
     */
    public function fatoresComPesosEfetivos(bool $temAtendimentoPublico = true): Collection
    {
        $fatores = $this->fatoresPesos()->with('fator')->get();

        if ($temAtendimentoPublico) {
            return $fatores;
        }

        // RF-06: redistribuir peso dos fatores marcados como redistribuivel
        $redistribuiveis = $fatores->where('redistribuivel', true);
        $naoRedistribuiveis = $fatores->where('redistribuivel', false);

        if ($redistribuiveis->isEmpty() || $naoRedistribuiveis->isEmpty()) {
            return $fatores;
        }

        $pesoTotal = $redistribuiveis->sum('peso');
        $pesoBase  = $naoRedistribuiveis->sum('peso');

        // Distribui proporcionalmente entre os demais fatores
        return $naoRedistribuiveis->map(function (ModeloFatorPeso $mfp) use ($pesoTotal, $pesoBase): ModeloFatorPeso {
            if ($pesoBase > 0) {
                $mfp->peso = round($mfp->peso + ($mfp->peso / $pesoBase) * $pesoTotal, 2);
            }
            return $mfp;
        });
    }

    // ── Scopes ────────────────────────────────────────────────────────

    public function scopeAtivos(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }

    public function scopeVigentes(Builder $query, ?string $data = null): Builder
    {
        $targetDate = $data ?? now()->toDateString();

        return $query->where('ativo', true)
            ->where('vigencia_inicio', '<=', $targetDate)
            ->where(function (Builder $q) use ($targetDate): void {
                $q->whereNull('vigencia_fim')
                    ->orWhere('vigencia_fim', '>=', $targetDate);
            });
    }
}

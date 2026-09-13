<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Escala Gráfica de Avaliação de Desempenho (Chiavenato).
 *
 * Cada instância é associada a um ModeloFormulario e contém de 3 a 5 níveis
 * configuráveis pela Comissão de Avaliação (RF-03).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $modelo_id
 * @property string $nome
 * @property string|null $descricao
 * @property int $qtd_niveis
 * @property bool $ativa
 */
final class EscalaGrafica extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_escalas_graficas';

    protected $fillable = [
        'tenant_id',
        'modelo_id',
        'nome',
        'descricao',
        'qtd_niveis',
        'ativa',
    ];

    protected $casts = [
        'tenant_id'  => 'integer',
        'modelo_id'  => 'integer',
        'qtd_niveis' => 'integer',
        'ativa'      => 'boolean',
    ];

    // ── Relacionamentos ───────────────────────────────────────────────

    public function modelo(): BelongsTo
    {
        return $this->belongsTo(ModeloFormulario::class, 'modelo_id');
    }

    public function niveis(): HasMany
    {
        return $this->hasMany(EscalaNivel::class, 'escala_id')->orderBy('grau');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeAtivas(Builder $query): Builder
    {
        return $query->where('ativa', true);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Retorna o nível correspondente a uma pontuação (0-100).
     */
    public function nivelParaNota(float $nota): ?EscalaNivel
    {
        return $this->niveis
            ->first(fn (EscalaNivel $n) => $nota >= $n->valor_min && $nota <= $n->valor_max);
    }

    /**
     * Valida que os níveis cobrem toda a faixa 0-100 sem sobreposição.
     * Retorna lista de erros (vazia = válido).
     *
     * @return list<string>
     */
    public function validarNiveis(): array
    {
        $niveis = $this->niveis->sortBy('grau')->values();
        $erros  = [];

        if ($niveis->isEmpty()) {
            return ['A escala não possui níveis cadastrados.'];
        }

        if ((float) $niveis->first()->valor_min !== 0.0) {
            $erros[] = 'O grau 1 deve iniciar em 0.';
        }

        if ((float) $niveis->last()->valor_max !== 100.0) {
            $erros[] = 'O último grau deve encerrar em 100.';
        }

        // Verifica contiguidade
        for ($i = 0; $i < $niveis->count() - 1; $i++) {
            $atual    = $niveis[$i];
            $proximo  = $niveis[$i + 1];
            $esperado = (float) $atual->valor_max + 0.01;

            if (abs((float) $proximo->valor_min - $esperado) > 0.02) {
                $erros[] = "Gap entre grau {$atual->grau} e grau {$proximo->grau}: {$atual->valor_max} → {$proximo->valor_min}.";
            }
        }

        return $erros;
    }
}

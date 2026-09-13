<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nível / Grau da Escala Gráfica de Avaliação (RF-03).
 *
 * Cada grau possui rótulo (ex.: "Excelente"), faixa de pontuação (valor_min a valor_max)
 * e descrição comportamental parametrizada pela Comissão.
 *
 * @property int $id
 * @property int $escala_id
 * @property int $grau          — 1 (inferior) a N (superior)
 * @property string $rotulo     — ex.: "Insuficiente", "Regular", "Bom", "Muito Bom", "Excelente"
 * @property float $valor_min
 * @property float $valor_max
 * @property string|null $descricao_comportamental
 */
final class EscalaNivel extends Model
{
    protected $table = 'capd_escala_niveis';

    protected $fillable = [
        'escala_id',
        'grau',
        'rotulo',
        'valor_min',
        'valor_max',
        'descricao_comportamental',
    ];

    protected $casts = [
        'escala_id' => 'integer',
        'grau'      => 'integer',
        'valor_min' => 'float',
        'valor_max' => 'float',
    ];

    // ── Relacionamentos ───────────────────────────────────────────────

    public function escala(): BelongsTo
    {
        return $this->belongsTo(EscalaGrafica::class, 'escala_id');
    }
}

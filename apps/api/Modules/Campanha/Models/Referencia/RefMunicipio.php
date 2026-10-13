<?php

declare(strict_types=1);

namespace Modules\Campanha\Models\Referencia;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Município da base pública (IBGE/TSE) — sem tenant: dado público igual para todos (D3).
 *
 * @property int $codigo_ibge
 * @property string $uf
 * @property string $nome
 * @property string $nome_normalizado
 * @property string|null $codigo_tse
 * @property string|null $regiao_intermediaria
 * @property int|null $populacao
 * @property int|null $eleitores
 */
final class RefMunicipio extends Model
{
    protected $table = 'campanha_ref_municipios';

    protected $primaryKey = 'codigo_ibge';

    public $incrementing = false;

    protected $guarded = [];

    protected $hidden = ['nome_normalizado'];

    protected $casts = [
        'codigo_ibge' => 'integer',
        'populacao' => 'integer',
        'ano_populacao' => 'integer',
        'eleitores' => 'integer',
        'zonas' => 'integer',
        'secoes' => 'integer',
        'ano_eleitorado' => 'integer',
    ];

    /** @return HasMany<RefMandatario, $this> */
    public function mandatarios(): HasMany
    {
        return $this->hasMany(RefMandatario::class, 'codigo_ibge', 'codigo_ibge');
    }

    /** Nome sem acento, caixa ou pontuação — chave de associação entre IBGE e TSE. */
    public static function normalizar(string $nome): string
    {
        $semAcento = \Normalizer::normalize($nome, \Normalizer::FORM_D);

        return (string) preg_replace('/[^A-Z0-9]/', '', mb_strtoupper((string) preg_replace('/\p{Mn}/u', '', (string) $semAcento)));
    }
}

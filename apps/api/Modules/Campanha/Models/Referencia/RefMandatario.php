<?php

declare(strict_types=1);

namespace Modules\Campanha\Models\Referencia;

use Illuminate\Database\Eloquent\Model;

/**
 * Eleito (prefeito, vice ou vereador) da base pública do TSE (D3, D9, D10).
 *
 * @property int $id
 * @property string $uf
 * @property int $codigo_ibge
 * @property string $cargo prefeito | vice_prefeito | vereador
 * @property string $nome
 * @property string|null $nome_urna
 * @property string|null $partido
 * @property string|null $numero
 */
final class RefMandatario extends Model
{
    protected $table = 'campanha_ref_mandatarios';

    protected $guarded = [];

    protected $casts = ['codigo_ibge' => 'integer', 'ano_eleicao' => 'integer', 'data_eleicao' => 'date:Y-m-d'];
}

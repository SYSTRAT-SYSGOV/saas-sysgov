<?php

declare(strict_types=1);

namespace Modules\Campanha\Models\Referencia;

use Illuminate\Database\Eloquent\Model;

/**
 * Registro de uma execução da importação da base pública (D4): fontes, contagens e não associados.
 *
 * @property int $id
 * @property string $uf
 * @property string $situacao em_andamento | concluida | concluida_com_falhas
 * @property array<string, mixed>|null $resumo
 */
final class RefImportacao extends Model
{
    protected $table = 'campanha_ref_importacoes';

    protected $guarded = [];

    protected $casts = ['resumo' => 'array', 'iniciado_em' => 'datetime', 'concluido_em' => 'datetime'];
}

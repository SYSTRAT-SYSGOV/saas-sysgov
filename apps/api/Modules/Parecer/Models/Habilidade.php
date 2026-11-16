<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Habilidade avaliada no parecer, por série e matéria (currículo da rede, por tenant). trimestres = "123", "13"…
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $serie
 * @property string $materia
 * @property int $ordem
 * @property string $descricao
 * @property string|null $codigo_bncc
 * @property string $trimestres
 * @property bool $ativo
 */
final class Habilidade extends Model
{
    use TenantAware;

    protected $table = 'parecer_habilidades';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'serie', 'materia', 'ordem', 'descricao', 'codigo_bncc', 'trimestres', 'ativo'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'serie' => 'integer', 'ordem' => 'integer', 'ativo' => 'boolean'];
}

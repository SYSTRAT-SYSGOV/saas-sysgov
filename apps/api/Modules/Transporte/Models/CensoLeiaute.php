<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Leiaute de importação do arquivo do Educacenso de um órgão. `campos` guarda só o que o órgão mudou nos campos
 * nativos (posição, rótulo, ativo, mapa, formato) e os campos que ele criou; o resto vem do leiaute base em código.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $base
 * @property int $ano_censo
 * @property string $delimitador
 * @property string $codificacao
 * @property list<array<string, mixed>> $campos
 * @property bool $padrao
 */
final class CensoLeiaute extends Model
{
    use TenantAware;

    protected $table = 'transporte_censo_leiautes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'nome', 'base', 'ano_censo', 'delimitador', 'codificacao', 'campos', 'padrao'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'ano_censo' => 'integer', 'campos' => 'array', 'padrao' => 'boolean'];
}

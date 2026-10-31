<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Seleção de campos do Censo salva por tenant (design D35). O modelo padrão ("Registro 60 completo") não é alterado
 * nem excluído.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $leiaute
 * @property list<string> $campos
 * @property bool $padrao
 * @property int|null $criado_por
 */
final class ModeloExportacao extends Model
{
    use TenantAware;

    public const NOME_PADRAO = 'Registro 60 completo';

    protected $table = 'transporte_modelos_exportacao';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'nome', 'leiaute', 'campos', 'padrao', 'criado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'campos' => 'array', 'padrao' => 'boolean', 'criado_por' => 'integer'];
}

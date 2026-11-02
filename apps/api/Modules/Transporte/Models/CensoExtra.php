<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Valor lido do arquivo do Educacenso que não altera o cadastro (destino "extra"). O valor de campo sensível nunca
 * aparece em listagem, relatório ou auditoria.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $entidade escola | turma | aluno
 * @property int $entidade_id
 * @property string $chave
 * @property string $valor
 * @property bool $sensivel
 * @property int|null $importacao_id
 */
final class CensoExtra extends Model
{
    use TenantAware;

    protected $table = 'transporte_censo_extras';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'entidade', 'entidade_id', 'chave', 'valor', 'sensivel', 'importacao_id'];

    /** @var list<string> */
    protected $hidden = ['valor'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'entidade_id' => 'integer', 'sensivel' => 'boolean', 'importacao_id' => 'integer'];
}

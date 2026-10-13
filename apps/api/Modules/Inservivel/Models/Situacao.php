<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Inservivel\Enums\PapelSituacao;

/**
 * Situação do bem (D2). Com `papel`, é situação de sistema: pode ser renomeada, nunca excluída nem desativada.
 *
 * @property int $id
 * @property string $nome
 * @property PapelSituacao|null $papel
 * @property bool $ativo
 */
final class Situacao extends Model
{
    use TenantAware;

    protected $table = 'inservivel_situacoes';

    protected $fillable = ['tenant_id', 'nome', 'papel', 'ativo'];

    protected $casts = ['tenant_id' => 'integer', 'ativo' => 'boolean', 'papel' => PapelSituacao::class];

    public function deSistema(): bool
    {
        return $this->papel !== null;
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property string $tipo
 * @property string $numero
 * @property string|null $orgao_emissor
 */
final class PessoaDocumento extends Model
{
    use TenantAware;

    public const TIPOS = ['rg', 'cnh', 'titulo_eleitor'];

    protected $table = 'pessoas_documentos';

    protected $guarded = ['id', 'tenant_id'];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Anexo do lote em disco privado (D12). `gerado_pelo_sistema` marca o relatório oficial do sorteio.
 *
 * @property int $id
 * @property int $lote_id
 * @property string $nome
 * @property string $caminho
 * @property string $mime
 * @property bool $gerado_pelo_sistema
 */
final class LoteDocumento extends Model
{
    use TenantAware;

    protected $table = 'inservivel_lote_documentos';

    protected $fillable = ['tenant_id', 'lote_id', 'nome', 'caminho', 'mime', 'gerado_pelo_sistema', 'criado_por'];

    protected $hidden = ['caminho'];

    protected $casts = ['tenant_id' => 'integer', 'lote_id' => 'integer', 'gerado_pelo_sistema' => 'boolean'];
}

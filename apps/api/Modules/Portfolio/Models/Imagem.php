<?php

declare(strict_types=1);

namespace Modules\Portfolio\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Evidência em imagem de um trabalho (JPEG ≤ 1600 px no disco local privado, design D4).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $trabalho_id
 * @property string $path
 * @property string $nome_original
 * @property string $mime
 * @property int $tamanho
 * @property int $ordem
 * @property-read Trabalho|null $trabalho
 */
final class Imagem extends Model
{
    use TenantAware;

    protected $table = 'portfolio_imagens';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'trabalho_id', 'path', 'nome_original', 'mime', 'tamanho', 'ordem'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'trabalho_id' => 'integer', 'tamanho' => 'integer', 'ordem' => 'integer'];

    /** @var list<string> */
    protected $hidden = ['path'];

    /** @return BelongsTo<Trabalho, $this> */
    public function trabalho(): BelongsTo
    {
        return $this->belongsTo(Trabalho::class, 'trabalho_id');
    }
}

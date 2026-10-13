<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Support\NomeNormalizado;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property string $nome
 * @property string $nome_normalizado
 * @property string $cor
 */
final class CategoriaOcorrencia extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_categorias_ocorrencia';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'nome', 'cor'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer'];

    /** @var list<string> */
    protected $hidden = ['nome_normalizado'];

    public function setNomeAttribute(string $valor): void
    {
        $this->attributes['nome'] = trim(preg_replace('/\s+/', ' ', $valor) ?? $valor);
        $this->attributes['nome_normalizado'] = NomeNormalizado::de($valor);
    }

    public function setCorAttribute(string $valor): void
    {
        $this->attributes['cor'] = strtolower($valor);
    }
}

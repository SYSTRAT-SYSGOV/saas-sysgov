<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Material de campanha (D2). Estoque = quantidade produzida − soma das remessas; valor contábil = total do lote.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $tipo
 * @property string $nome
 * @property string|null $fornecedor
 * @property string $unidade
 * @property int $quantidade_produzida
 * @property int $valor_total_centavos
 * @property string|null $imagem
 */
final class Material extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    public const TIPOS = [
        'santinho' => 'Santinho', 'folder' => 'Folder', 'adesivo' => 'Adesivo', 'bandeira' => 'Bandeira', 'praguinha' => 'Praguinha',
        'cartaz' => 'Cartaz', 'banner' => 'Banner', 'faixa' => 'Faixa', 'cavalete' => 'Cavalete', 'perfurado' => 'Perfurado',
        'jornal' => 'Jornal', 'revista' => 'Revista', 'envelope' => 'Envelope', 'camiseta' => 'Camiseta', 'bone' => 'Boné',
        'caneta' => 'Caneta', 'brinde' => 'Brinde', 'outro' => 'Outro',
    ];

    public const UNIDADES = ['unidades', 'milheiros', 'centos', 'pacotes', 'caixas', 'fardos', 'resmas', 'kits'];

    protected $table = 'campanha_materiais';

    protected $fillable = ['tenant_id', 'campanha_id', 'tipo', 'nome', 'fornecedor', 'unidade', 'quantidade_produzida', 'valor_total_centavos', 'peso_kg', 'volume_m3', 'observacoes'];

    protected $hidden = ['imagem'];

    protected $appends = ['tem_imagem'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'quantidade_produzida' => 'integer',
        'valor_total_centavos' => 'integer',
        'peso_kg' => 'float',
        'volume_m3' => 'float',
    ];

    /** @return HasMany<Remessa, $this> */
    public function remessas(): HasMany
    {
        return $this->hasMany(Remessa::class, 'material_id');
    }

    public function totalEnviado(): int
    {
        return (int) $this->remessas()->sum('quantidade');
    }

    public function estoque(): int
    {
        return $this->quantidade_produzida - $this->totalEnviado();
    }

    public function getTemImagemAttribute(): bool
    {
        return $this->imagem !== null;
    }
}

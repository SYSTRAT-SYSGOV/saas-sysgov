<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Fundo de certificado da biblioteca do órgão (D8): imagem JPEG de página inteira, escolhida no
 * construtor do curso. Trocar o arquivo cria outro — certificados emitidos apontam para o antigo.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $descricao
 * @property string $imagem_path
 * @property string $orientacao paisagem|retrato
 * @property bool $ativo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string $imagem_url
 */
final class Fundo extends Model
{
    use TenantAware;

    protected $table = 'cursos_fundos';

    protected $fillable = ['tenant_id', 'nome', 'descricao', 'imagem_path', 'orientacao', 'ativo'];

    protected $attributes = ['ativo' => true, 'orientacao' => 'paisagem'];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo' => 'boolean',
    ];

    protected $appends = ['imagem_url'];

    /** @return Attribute<string, never> */
    protected function imagemUrl(): Attribute
    {
        return Attribute::make(get: fn (): string => Storage::disk('public')->url($this->imagem_path));
    }
}

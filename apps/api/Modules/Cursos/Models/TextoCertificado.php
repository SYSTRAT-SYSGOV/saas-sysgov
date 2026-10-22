<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo de texto da biblioteca do órgão (D8): tipo de certificado, texto principal com campos
 * dinâmicos e texto complementar. O leiaute do curso usa a versão atual na emissão.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $tipo_certificado
 * @property string $texto_principal
 * @property string|null $texto_complementar
 * @property string|null $observacoes
 * @property bool $ativo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class TextoCertificado extends Model
{
    use TenantAware;

    protected $table = 'cursos_textos';

    protected $fillable = ['tenant_id', 'nome', 'tipo_certificado', 'texto_principal', 'texto_complementar', 'observacoes', 'ativo'];

    protected $attributes = ['ativo' => true];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativo' => 'boolean',
    ];
}

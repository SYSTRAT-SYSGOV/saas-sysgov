<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $titulo
 * @property string $corpo
 * @property string|null $logotipo_path
 * @property list<array{nome: string, cargo: string, imagem_path: string|null}>|null $assinaturas
 * @property bool $padrao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ModeloCertificado extends Model
{
    use TenantAware;

    protected $table = 'cursos_modelos_certificado';

    protected $fillable = ['tenant_id', 'nome', 'titulo', 'corpo', 'logotipo_path', 'assinaturas', 'padrao'];

    protected $casts = [
        'tenant_id' => 'integer',
        'assinaturas' => 'array',
        'padrao' => 'boolean',
    ];
}

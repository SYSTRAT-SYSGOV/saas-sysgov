<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Assinatura da biblioteca do órgão (D4), posicionada pelos modelos visuais. Imagens trocadas
 * ganham arquivo novo e as antigas ficam: certificados emitidos apontam para elas no snapshot.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $cargo
 * @property string|null $registro_profissional
 * @property string|null $imagem_path
 * @property string|null $selo_path
 * @property bool $ativa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string|null $imagem_url
 * @property-read string|null $selo_url
 */
final class Assinatura extends Model
{
    use TenantAware;

    protected $table = 'cursos_assinaturas';

    protected $fillable = ['tenant_id', 'nome', 'cargo', 'registro_profissional', 'imagem_path', 'selo_path', 'ativa'];

    protected $attributes = ['ativa' => true];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativa' => 'boolean',
    ];

    protected $appends = ['imagem_url', 'selo_url'];

    /** Cargo e registro na linha abaixo do nome: "Instrutora — CREA 12345". */
    public function linhaCargo(): string
    {
        return implode(' — ', array_filter([trim((string) $this->cargo), trim((string) $this->registro_profissional)], fn (string $p): bool => $p !== ''));
    }

    /** @return Attribute<string|null, never> */
    protected function imagemUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => $this->imagem_path !== null ? Storage::disk('public')->url($this->imagem_path) : null);
    }

    /** @return Attribute<string|null, never> */
    protected function seloUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => $this->selo_path !== null ? Storage::disk('public')->url($this->selo_path) : null);
    }
}

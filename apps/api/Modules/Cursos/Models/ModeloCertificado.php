<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $curso_id leiaute do construtor por curso (D8)
 * @property int|null $fundo_id
 * @property int|null $texto_id
 * @property-read Fundo|null $fundo
 * @property-read TextoCertificado|null $texto
 * @property string $nome
 * @property string $tipo padrao|visual
 * @property string $orientacao paisagem|retrato
 * @property string $titulo
 * @property string $corpo
 * @property string|null $logotipo_path
 * @property string|null $fundo_path
 * @property list<array<string, mixed>>|null $elementos
 * @property bool $verso_ativo
 * @property string|null $verso_fundo_path
 * @property-read string|null $logotipo_url
 * @property-read string|null $fundo_url
 * @property-read string|null $verso_fundo_url
 * @property list<array{nome: string, cargo: string, imagem_path: string|null}>|null $assinaturas
 * @property bool $padrao
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class ModeloCertificado extends Model
{
    use TenantAware;

    protected $table = 'cursos_modelos_certificado';

    public const TIPO_PADRAO = 'padrao';

    public const TIPO_VISUAL = 'visual';

    protected $fillable = [
        'tenant_id', 'curso_id', 'fundo_id', 'texto_id', 'nome', 'tipo', 'orientacao', 'titulo', 'corpo', 'logotipo_path', 'fundo_path',
        'elementos', 'verso_ativo', 'verso_fundo_path', 'assinaturas', 'padrao',
    ];

    protected $attributes = [
        'tipo' => self::TIPO_PADRAO,
        'orientacao' => 'paisagem',
        'verso_ativo' => false,
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'fundo_id' => 'integer',
        'texto_id' => 'integer',
        'assinaturas' => 'array',
        'elementos' => 'array',
        'padrao' => 'boolean',
        'verso_ativo' => 'boolean',
    ];

    /** URLs públicas das imagens, usadas pelo construtor no painel. */
    protected $appends = ['logotipo_url', 'fundo_url', 'verso_fundo_url'];

    public function visual(): bool
    {
        return $this->tipo === self::TIPO_VISUAL;
    }

    /** @return BelongsTo<Fundo, $this> */
    public function fundo(): BelongsTo
    {
        return $this->belongsTo(Fundo::class, 'fundo_id');
    }

    /** @return BelongsTo<TextoCertificado, $this> */
    public function texto(): BelongsTo
    {
        return $this->belongsTo(TextoCertificado::class, 'texto_id');
    }

    /** Fundo impresso: o da biblioteca quando o leiaute usa um, senão o enviado no próprio modelo. */
    public function caminhoDoFundo(): ?string
    {
        return $this->fundo !== null ? $this->fundo->imagem_path : $this->fundo_path;
    }

    /** @return Attribute<string|null, never> */
    protected function logotipoUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => self::url($this->logotipo_path));
    }

    /** @return Attribute<string|null, never> */
    protected function fundoUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => self::url($this->caminhoDoFundo()));
    }

    /** @return Attribute<string|null, never> */
    protected function versoFundoUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => self::url($this->verso_fundo_path));
    }

    private static function url(?string $caminho): ?string
    {
        return $caminho !== null ? Storage::disk('public')->url($caminho) : null;
    }
}

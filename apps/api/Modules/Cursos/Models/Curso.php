<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Modules\Cursos\Enums\StatusCurso;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Enums\TipoCurso;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo
 * @property string $titulo
 * @property string|null $descricao
 * @property int $carga_horaria_minutos
 * @property string|null $capa_path
 * @property string $status
 * @property int $frequencia_minima
 * @property string|null $nota_minima
 * @property int|null $modelo_certificado_id
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Turma> $turmas
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Aula> $aulas
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Material> $materiais
 * @property-read ModeloCertificado|null $modeloCertificado
 * @property-read string|null $capa_url
 */
final class Curso extends Model
{
    use TenantAware;

    protected $table = 'cursos_cursos';

    protected $fillable = [
        'tenant_id', 'tipo', 'titulo', 'descricao', 'carga_horaria_minutos', 'capa_path', 'status',
        'frequencia_minima', 'nota_minima', 'modelo_certificado_id', 'criado_por',
    ];

    protected $appends = ['capa_url'];

    protected $casts = [
        'tenant_id' => 'integer',
        'carga_horaria_minutos' => 'integer',
        'frequencia_minima' => 'integer',
        'nota_minima' => 'decimal:2',
        'modelo_certificado_id' => 'integer',
        'criado_por' => 'integer',
    ];

    /** @return Attribute<string|null, never> */
    protected function capaUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => $this->capa_path !== null ? Storage::disk('public')->url($this->capa_path) : null);
    }

    public function statusEnum(): StatusCurso
    {
        return StatusCurso::from($this->status);
    }

    public function tipoEnum(): TipoCurso
    {
        return TipoCurso::from($this->tipo);
    }

    /** @return HasMany<Turma, $this> */
    public function turmas(): HasMany
    {
        return $this->hasMany(Turma::class, 'curso_id');
    }

    /** @return HasMany<Aula, $this> */
    public function aulas(): HasMany
    {
        return $this->hasMany(Aula::class, 'curso_id')->orderBy('ordem')->orderBy('id');
    }

    /** @return HasMany<Material, $this> */
    public function materiais(): HasMany
    {
        return $this->hasMany(Material::class, 'curso_id')->orderBy('ordem')->orderBy('id');
    }

    /** @return HasManyThrough<Inscricao, Turma, $this> */
    public function inscricoes(): HasManyThrough
    {
        return $this->hasManyThrough(Inscricao::class, Turma::class, 'curso_id', 'turma_id');
    }

    /** @return BelongsToMany<Formacao, $this, FormacaoCurso> */
    public function formacoes(): BelongsToMany
    {
        return $this->belongsToMany(Formacao::class, 'cursos_formacao_cursos', 'curso_id', 'formacao_id')
            ->using(FormacaoCurso::class)
            ->withPivot(['ordem', 'obrigatorio']);
    }

    /** @return BelongsTo<ModeloCertificado, $this> */
    public function modeloCertificado(): BelongsTo
    {
        return $this->belongsTo(ModeloCertificado::class, 'modelo_certificado_id');
    }
}

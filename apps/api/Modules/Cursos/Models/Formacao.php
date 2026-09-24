<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $titulo
 * @property string|null $descricao
 * @property int|null $modelo_certificado_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Curso> $cursos
 * @property-read ModeloCertificado|null $modeloCertificado
 */
final class Formacao extends Model
{
    use TenantAware;

    protected $table = 'cursos_formacoes';

    protected $fillable = ['tenant_id', 'titulo', 'descricao', 'modelo_certificado_id'];

    protected $casts = [
        'tenant_id' => 'integer',
        'modelo_certificado_id' => 'integer',
    ];

    /**
     * Pivot com tenant_id próprio: quem faz attach/sync passa o tenant_id
     * explicitamente (o TenantAware não age em tabela pivot).
     *
     * @return BelongsToMany<Curso, $this, FormacaoCurso>
     */
    public function cursos(): BelongsToMany
    {
        return $this->belongsToMany(Curso::class, 'cursos_formacao_cursos', 'formacao_id', 'curso_id')
            ->using(FormacaoCurso::class)
            ->withPivot(['ordem', 'obrigatorio', 'tenant_id'])
            ->withTimestamps()
            ->orderByPivot('ordem');
    }

    /** @return BelongsTo<ModeloCertificado, $this> */
    public function modeloCertificado(): BelongsTo
    {
        return $this->belongsTo(ModeloCertificado::class, 'modelo_certificado_id');
    }
}

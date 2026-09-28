<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Cursos\Contracts\ComLiberacao;
use Modules\Cursos\Enums\RegraLiberacao;
use Modules\Cursos\Enums\TipoMaterial;
use Modules\Cursos\Support\VideoUrl;

/**
 * Material do curso (vale para todas as turmas; a liberação é calculada por turma).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property int|null $aula_id
 * @property string $tipo
 * @property string $titulo
 * @property string|null $descricao
 * @property int $ordem
 * @property bool $publicado
 * @property string|null $conteudo
 * @property string|null $url
 * @property string|null $video_provedor
 * @property string|null $video_id
 * @property string|null $arquivo_path
 * @property string|null $arquivo_nome
 * @property int|null $arquivo_tamanho
 * @property string $liberacao_regra
 * @property int|null $liberacao_dias
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 * @property-read Aula|null $aula
 * @property-read string|null $embed_url
 */
final class Material extends Model implements ComLiberacao
{
    use TenantAware;

    protected $table = 'cursos_materiais';

    protected $fillable = [
        'tenant_id', 'curso_id', 'aula_id', 'tipo', 'titulo', 'descricao', 'ordem', 'publicado', 'conteudo', 'url',
        'video_provedor', 'video_id', 'arquivo_path', 'arquivo_nome', 'arquivo_tamanho', 'liberacao_regra', 'liberacao_dias',
    ];

    /** O caminho do arquivo é interno: o PDF só sai pelo endpoint autorizado (design D3). */
    protected $hidden = ['arquivo_path'];

    protected $appends = ['embed_url'];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'aula_id' => 'integer',
        'ordem' => 'integer',
        'publicado' => 'boolean',
        'arquivo_tamanho' => 'integer',
        'liberacao_dias' => 'integer',
    ];

    public function tipoEnum(): TipoMaterial
    {
        return TipoMaterial::from($this->tipo);
    }

    /** @return Attribute<string|null, never> */
    protected function embedUrl(): Attribute
    {
        return Attribute::make(get: fn (): ?string => $this->video_provedor !== null && $this->video_id !== null
            ? VideoUrl::embed($this->video_provedor, $this->video_id)
            : null);
    }

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /** @return BelongsTo<Aula, $this> */
    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    public function regraLiberacao(): RegraLiberacao
    {
        return RegraLiberacao::from($this->liberacao_regra);
    }

    public function diasLiberacao(): ?int
    {
        return $this->liberacao_dias;
    }

    public function aulaLiberacaoId(): ?int
    {
        return $this->aula_id;
    }
}

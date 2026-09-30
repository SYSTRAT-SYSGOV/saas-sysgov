<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Cursos\Enums\TipoCampoInscricao;

/**
 * Campo extra do formulário de inscrição de um curso (design D9). Vale para toda inscrição do
 * curso, de servidor ou de externo. Desativado (`ativo=false`) não é pedido em inscrições novas,
 * mas continua existindo pra não quebrar o snapshot das respostas já dadas.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property string $rotulo
 * @property string $tipo
 * @property bool $obrigatorio
 * @property list<string>|null $opcoes
 * @property int $ordem
 * @property bool $ativo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 */
final class CampoInscricao extends Model
{
    use TenantAware;

    protected $table = 'cursos_campos_inscricao';

    protected $fillable = ['tenant_id', 'curso_id', 'rotulo', 'tipo', 'obrigatorio', 'opcoes', 'ordem', 'ativo'];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'obrigatorio' => 'boolean',
        'opcoes' => 'array',
        'ordem' => 'integer',
        'ativo' => 'boolean',
    ];

    public function tipoEnum(): TipoCampoInscricao
    {
        return TipoCampoInscricao::from($this->tipo);
    }

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /** @return HasMany<RespostaInscricao, $this> */
    public function respostas(): HasMany
    {
        return $this->hasMany(RespostaInscricao::class, 'campo_id');
    }
}

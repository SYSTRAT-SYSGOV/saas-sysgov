<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Pergunta de um modelo de formulário de vistoria.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $modelo_id
 * @property string $enunciado
 * @property string $tipo
 * @property array<int, string>|null $opcoes
 * @property bool $obrigatoria
 * @property int $ordem
 * @property bool $ativo
 */
final class Pergunta extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_perguntas';

    public const TIPO_MULTIPLA_ESCOLHA = 'multipla_escolha';
    public const TIPO_TEXTO_LIVRE = 'texto_livre';
    public const TIPO_FOTO = 'foto';

    public const TIPOS_VALIDOS = [
        self::TIPO_MULTIPLA_ESCOLHA,
        self::TIPO_TEXTO_LIVRE,
        self::TIPO_FOTO,
    ];

    protected $fillable = [
        'tenant_id',
        'modelo_id',
        'enunciado',
        'tipo',
        'opcoes',
        'obrigatoria',
        'ordem',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'modelo_id' => 'integer',
        'opcoes' => 'array',
        'obrigatoria' => 'boolean',
        'ordem' => 'integer',
        'ativo' => 'boolean',
    ];

    /** @return BelongsTo<ModeloFormulario, $this> */
    public function modelo(): BelongsTo
    {
        return $this->belongsTo(ModeloFormulario::class, 'modelo_id');
    }
}

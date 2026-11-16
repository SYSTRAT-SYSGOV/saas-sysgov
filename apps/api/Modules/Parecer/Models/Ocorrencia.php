<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Ocorrência de um aluno, com categoria do cadastro Escola e anexo opcional.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property \Illuminate\Support\Carbon $data
 * @property int|null $categoria_id
 * @property string $descricao
 * @property int|null $registrado_por
 * @property string|null $registrado_nome
 * @property string|null $anexo_path
 * @property string|null $anexo_nome
 * @property \Modules\Escola\Models\Aluno|null $aluno
 * @property \Modules\Escola\Models\CategoriaOcorrencia|null $categoria
 */
final class Ocorrencia extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_ocorrencias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'data', 'categoria_id', 'descricao', 'registrado_por', 'registrado_nome', 'anexo_path', 'anexo_nome'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'data' => 'date:Y-m-d', 'categoria_id' => 'integer', 'registrado_por' => 'integer', 'escola_id' => 'integer'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }

    /** @return BelongsTo<CategoriaOcorrencia, $this> */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaOcorrencia::class, 'categoria_id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\CategoriaOcorrencia;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property int $categoria_id
 * @property \Illuminate\Support\Carbon $data
 * @property string $descricao
 * @property string $severidade
 * @property string|null $responsavel
 * @property string|null $anexo_path
 * @property string|null $anexo_nome
 * @property int|null $registrado_por
 * @property-read Aluno|null $aluno
 * @property-read CategoriaOcorrencia|null $categoria
 */
final class Ocorrencia extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_ocorrencias';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'categoria_id', 'data', 'descricao', 'severidade', 'responsavel', 'anexo_path', 'anexo_nome', 'registrado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'categoria_id' => 'integer', 'data' => 'date:Y-m-d', 'registrado_por' => 'integer'];

    /** @var list<string> */
    protected $hidden = ['anexo_path'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }

    /** Categoria excluída continua aparecendo nas ocorrências já registradas. */
    /** @return BelongsTo<CategoriaOcorrencia, $this> */
    public function categoria(): BelongsTo
    {
        return $this->belongsTo(CategoriaOcorrencia::class, 'categoria_id')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}

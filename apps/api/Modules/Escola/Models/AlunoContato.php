<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $aluno_id
 * @property string $telefone
 * @property string|null $descricao
 * @property int $ordem
 */
final class AlunoContato extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_aluno_contatos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'aluno_id', 'telefone', 'descricao', 'ordem'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'aluno_id' => 'integer', 'ordem' => 'integer'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id');
    }
}

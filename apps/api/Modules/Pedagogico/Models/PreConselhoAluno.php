<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Aluno;

/**
 * Avaliação de um aluno numa ficha de pré-conselho, identificada pelo id do aluno (nunca pela posição na lista).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $pre_conselho_id
 * @property int $aluno_id
 * @property string $nivel_atencao
 * @property string|null $dificuldade
 * @property string|null $encaminhamentos
 * @property bool $destaque
 */
final class PreConselhoAluno extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'pedagogico_pre_conselho_alunos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'pre_conselho_id', 'aluno_id', 'nivel_atencao', 'dificuldade', 'encaminhamentos', 'destaque'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'pre_conselho_id' => 'integer', 'aluno_id' => 'integer', 'destaque' => 'boolean'];

    /** @return BelongsTo<Aluno, $this> */
    public function aluno(): BelongsTo
    {
        return $this->belongsTo(Aluno::class, 'aluno_id')->withTrashed();
    }
}

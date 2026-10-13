<?php

declare(strict_types=1);

namespace Modules\Ata\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Participante que assina a ata (D2): do Cadastro de Pessoas (pessoa_id) ou avulso (só o nome).
 *
 * @property int $id
 * @property int $ata_id
 * @property int|null $pessoa_id
 * @property string $nome
 * @property string|null $cargo
 * @property int $ordem
 * @property string|null $assinatura_path
 * @property Carbon|null $assinado_em
 * @property int|null $assinatura_registrada_por
 */
final class AtaParticipante extends Model
{
    use TenantAware;

    protected $table = 'ata_participantes';

    protected $fillable = ['tenant_id', 'ata_id', 'pessoa_id', 'nome', 'cargo', 'ordem', 'assinatura_path', 'assinado_em', 'assinatura_registrada_por'];

    protected $casts = [
        'tenant_id' => 'integer',
        'ata_id' => 'integer',
        'pessoa_id' => 'integer',
        'ordem' => 'integer',
        'assinado_em' => 'datetime',
        'assinatura_registrada_por' => 'integer',
    ];

    public function assinou(): bool
    {
        return $this->assinado_em !== null;
    }

    /** @return BelongsTo<Ata, $this> */
    public function ata(): BelongsTo
    {
        return $this->belongsTo(Ata::class, 'ata_id');
    }
}

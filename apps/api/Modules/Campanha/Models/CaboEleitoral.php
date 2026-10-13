<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Campanha\Models\Concerns\CampanhaAware;
use Modules\Pessoas\Models\Pessoa;

/**
 * Cabo eleitoral da campanha, com CPF opcional ligado a Pessoa e ajuda de custo em centavos (D8).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int|null $pessoa_id
 */
final class CaboEleitoral extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_cabos';

    protected $fillable = ['tenant_id', 'campanha_id', 'pessoa_id', 'nome', 'codigo_ibge', 'bairro', 'endereco', 'coordenador_id', 'votos_estimados', 'area_atuacao', 'disponibilidade', 'veiculo_proprio', 'ajuda_custo', 'valor_ajuda_centavos', 'pix', 'banco', 'telefone', 'whatsapp', 'email', 'instagram', 'facebook', 'observacoes'];

    protected $hidden = ['pessoa'];

    protected $appends = ['cpf_mascarado'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'pessoa_id' => 'integer',
        'codigo_ibge' => 'integer',
        'coordenador_id' => 'integer',
        'votos_estimados' => 'integer',
        'veiculo_proprio' => 'boolean',
        'ajuda_custo' => 'boolean',
        'valor_ajuda_centavos' => 'integer',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** CPF da pessoa ligada, sempre mascarado (D8). */
    public function getCpfMascaradoAttribute(): ?string
    {
        return $this->pessoa_id !== null ? $this->pessoa?->cpf_mascarado : null;
    }
}

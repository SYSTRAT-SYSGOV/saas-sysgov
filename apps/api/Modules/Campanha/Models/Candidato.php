<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Campanha\Models\Concerns\CampanhaAware;
use Modules\Pessoas\Models\Pessoa;

/**
 * Candidato da campanha (um por campanha), ligado ao Cadastro de Pessoas pelo CPF (D8). O CPF fica só
 * na Pessoa (criptografado); aqui saem o nome e o CPF mascarado.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int $pessoa_id
 * @property string $nome_urna
 * @property-read Pessoa|null $pessoa
 */
final class Candidato extends Model
{
    use CampanhaAware;
    use TenantAware;

    protected $table = 'campanha_candidatos';

    protected $fillable = [
        'tenant_id', 'campanha_id', 'pessoa_id', 'nome_urna', 'partido', 'numero', 'coligacao', 'telefone', 'whatsapp',
        'email', 'instagram', 'facebook', 'tiktok', 'youtube', 'site', 'biografia', 'votos_ultima_eleicao',
        'cargo_ultima_eleicao', 'observacoes',
    ];

    protected $hidden = ['pessoa'];

    protected $appends = ['nome_completo', 'cpf_mascarado'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'pessoa_id' => 'integer',
        'votos_ultima_eleicao' => 'integer',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    public function getNomeCompletoAttribute(): ?string
    {
        return $this->pessoa?->nome;
    }

    public function getCpfMascaradoAttribute(): ?string
    {
        return $this->pessoa?->cpf_mascarado;
    }
}

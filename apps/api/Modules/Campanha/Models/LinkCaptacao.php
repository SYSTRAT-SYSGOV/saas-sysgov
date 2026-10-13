<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Link de captação de eleitores de um coordenador ou cabo eleitoral da campanha (D1). O código público é
 * aleatório (16 caracteres alfanuméricos) e único em todo o sistema: a URL não revela ids.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $codigo
 * @property string $tipo coordenador | cabo
 * @property int|null $coordenador_id
 * @property int|null $cabo_id
 * @property string|null $descricao
 * @property bool $ativo
 */
final class LinkCaptacao extends Model
{
    use CampanhaAware;
    use TenantAware;

    public const TIPOS = ['coordenador', 'cabo'];

    protected $table = 'campanha_links';

    protected $fillable = ['tenant_id', 'campanha_id', 'tipo', 'coordenador_id', 'cabo_id', 'descricao', 'ativo'];

    protected $attributes = ['ativo' => true];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'coordenador_id' => 'integer',
        'cabo_id' => 'integer',
        'ativo' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (LinkCaptacao $link): void {
            do {
                $codigo = Str::random(16);
            } while (self::query()->withoutGlobalScopes()->where('codigo', $codigo)->exists());
            $link->codigo = $codigo;
        });
    }

    /** @return BelongsTo<Campanha, $this> */
    public function campanha(): BelongsTo
    {
        return $this->belongsTo(Campanha::class, 'campanha_id');
    }

    /** @return BelongsTo<Coordenador, $this> */
    public function coordenador(): BelongsTo
    {
        return $this->belongsTo(Coordenador::class, 'coordenador_id');
    }

    /** @return BelongsTo<CaboEleitoral, $this> */
    public function cabo(): BelongsTo
    {
        return $this->belongsTo(CaboEleitoral::class, 'cabo_id');
    }

    /** @return HasMany<Eleitor, $this> */
    public function eleitores(): HasMany
    {
        return $this->hasMany(Eleitor::class, 'link_id');
    }

    public function nomeResponsavel(): string
    {
        $responsavel = $this->tipo === 'coordenador' ? $this->coordenador : $this->cabo;

        return $responsavel !== null ? (string) $responsavel->getAttribute('nome') : '—';
    }

    public function url(): string
    {
        return config('campanha.url_painel') . '/cadastro-apoio/' . $this->codigo;
    }
}

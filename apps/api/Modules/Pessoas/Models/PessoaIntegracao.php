<?php

declare(strict_types=1);

namespace Modules\Pessoas\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Configuração por tenant da importação de pessoas a partir de um sistema de
 * gestão da prefeitura (fora do SYSGOV).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $driver
 * @property string|null $api_url
 * @property string|null $api_token
 * @property array<string, string>|null $field_mappings
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $ultima_sincronizacao_em
 */
final class PessoaIntegracao extends Model
{
    use TenantAware;

    protected $table = 'pessoas_integracoes';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['api_token'];

    protected $appends = ['api_token_mascarado'];

    protected $casts = [
        'api_token' => 'encrypted',
        'field_mappings' => 'array',
        'is_active' => 'boolean',
        'ultima_sincronizacao_em' => 'datetime',
    ];

    public function getApiTokenMascaradoAttribute(): ?string
    {
        if (empty($this->api_token)) {
            return null;
        }

        $limpo = (string) $this->api_token;

        return str_repeat('•', max(strlen($limpo) - 4, 0)) . substr($limpo, -4);
    }

    /** @return HasMany<PessoaSyncLog, $this> */
    public function logs(): HasMany
    {
        return $this->hasMany(PessoaSyncLog::class, 'integracao_id');
    }
}

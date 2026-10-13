<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Credencial de integração M2M com um órgão de controle ambiental — mesmo padrão de
 * `Modules\Vistoria\Models\VistoriaIntegracao` (token dedicado mapeado direto a um
 * tenant, sem login humano), com duas diferenças: a chave é guardada só como hash
 * SHA-256 (o Vistoria guarda em texto puro) e a credencial pode, opcionalmente,
 * configurar envio ativo (push) para o órgão (`envio_url` + `envio_token`).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $orgao
 * @property string $api_key_hash
 * @property string $api_key_prefixo
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $ultimo_uso_em
 * @property string|null $envio_url
 * @property string|null $envio_token
 * @property \Illuminate\Support\Carbon $created_at
 */
final class MeioAmbienteIntegracao extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_integracoes';

    public const ORGAO_IBAMA = 'ibama';
    public const ORGAO_INEA = 'inea';
    public const ORGAO_CETESB = 'cetesb';
    public const ORGAO_OUTRO = 'outro';

    public const ORGAOS_VALIDOS = [
        self::ORGAO_IBAMA,
        self::ORGAO_INEA,
        self::ORGAO_CETESB,
        self::ORGAO_OUTRO,
    ];

    /** Prefixo das chaves geradas — facilita identificar a origem de um token vazado. */
    public const PREFIXO_CHAVE = 'mamb_';

    protected $fillable = [
        'tenant_id',
        'nome',
        'orgao',
        'api_key_hash',
        'api_key_prefixo',
        'is_active',
        'ultimo_uso_em',
        'envio_url',
        'envio_token',
    ];

    protected $hidden = [
        'api_key_hash',
        'envio_token',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'is_active' => 'boolean',
        'ultimo_uso_em' => 'datetime',
        'envio_token' => 'encrypted',
    ];

    public static function hashDaChave(string $apiKey): string
    {
        return hash('sha256', $apiKey);
    }

    public function enviaAtivamente(): bool
    {
        return $this->is_active && $this->envio_url !== null;
    }

    /** @return BelongsTo<Tenant, $this> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}

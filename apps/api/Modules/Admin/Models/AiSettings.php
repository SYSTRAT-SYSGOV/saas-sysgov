<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Configuração de IA da plataforma — registro único (singleton, sempre
 * id=1), gerenciado apenas pelo Admin SYSTRAT e compartilhado por TODOS os
 * tenants. Nenhum tenant tem configuração própria de IA.
 *
 * @property int $id
 * @property bool $enabled
 * @property string $provider
 * @property string $base_url
 * @property string|null $api_key
 * @property string $model
 * @property int $max_tokens
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User|null $updatedBy
 */
final class AiSettings extends Model
{
    protected $table = 'ai_settings';

    protected $fillable = ['enabled', 'provider', 'base_url', 'api_key', 'model', 'max_tokens', 'updated_by'];

    protected $casts = [
        'enabled' => 'boolean',
        // Criptografada em repouso — nunca fica em texto puro no banco nem
        // nos logs de query; só é decifrada em memória quando lida.
        'api_key' => 'encrypted',
        'max_tokens' => 'integer',
    ];

    /**
     * Sempre o mesmo registro (id=1) — cria com os valores padrão na
     * primeira leitura. Os defaults são passados aqui explicitamente (não
     * só na migration/DB): firstOrCreate() devolve a instância recém-criada
     * já em memória, sem um SELECT de volta — se os valores só existissem
     * como DEFAULT de coluna no MySQL, a instância retornada teria esses
     * atributos como null mesmo a linha tendo sido gravada corretamente.
     */
    public static function current(): self
    {
        return self::query()->firstOrCreate(['id' => 1], [
            'enabled' => false,
            'provider' => 'nanogpt',
            'base_url' => 'https://nano-gpt.com/api/v1',
            'model' => 'deepseek/deepseek-v4-pro-0813',
            'max_tokens' => 2048,
        ]);
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

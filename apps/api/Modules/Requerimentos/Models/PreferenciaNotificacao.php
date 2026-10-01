<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $user_id
 * @property array<int, string> $canais
 * @property bool   $digest_diario
 */
final class PreferenciaNotificacao extends Model
{
    use TenantAware;

    protected $table = 'requerimentos_preferencias_notificacao';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'canais',
        'digest_diario',
    ];

    protected $casts = [
        'tenant_id'      => 'integer',
        'user_id'        => 'integer',
        'canais'         => 'array',
        'digest_diario'  => 'boolean',
    ];

    public const CANAL_EMAIL  = 'email';
    public const CANAL_PORTAL = 'portal';

    /** @return array<int, string> */
    public function getCanaisHabilitados(): array
    {
        return $this->canais ?? [self::CANAL_EMAIL, self::CANAL_PORTAL];
    }

    public function canalHabilitado(string $canal): bool
    {
        return in_array($canal, $this->getCanaisHabilitados(), true);
    }
}
<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Controle de Sequencial Atômico para Matrículas por Tenant e Ano.
 */
final class EducaEnrollmentSequence extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_enrollment_sequences';

    protected $fillable = [
        'tenant_id',
        'ano',
        'current_number',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'current_number' => 'integer',
    ];

    /**
     * Gera o próximo código atômico no padrão YYYY-NNNNNN com lock pessimista.
     */
    public static function nextCode(int $tenantId, int $ano): string
    {
        $sequence = self::query()
            ->where('tenant_id', $tenantId)
            ->where('ano', $ano)
            ->lockForUpdate()
            ->first();

        if ($sequence === null) {
            $sequence = self::create([
                'tenant_id' => $tenantId,
                'ano' => $ano,
                'current_number' => 0,
            ]);
        }

        $next = $sequence->current_number + 1;
        $sequence->update(['current_number' => $next]);

        return sprintf('%04d-%06d', $ano, $next);
    }
}

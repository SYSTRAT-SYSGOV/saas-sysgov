<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Contador sequencial atômico por tenant/chave/exercício — mesmo padrão de
 * `Modules\Vistoria\Models\Contador`, usado para numerar processos de
 * licenciamento sem colisão sob concorrência (`lockForUpdate()` dentro de transação).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $chave
 * @property int $exercicio
 * @property int $valor
 */
final class Contador extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_contadores';

    protected $fillable = ['tenant_id', 'chave', 'exercicio', 'valor'];

    protected $casts = [
        'tenant_id' => 'integer',
        'exercicio' => 'integer',
        'valor' => 'integer',
    ];

    public static function proximoValor(int $tenantId, string $chave, int $exercicio): int
    {
        return DB::transaction(function () use ($tenantId, $chave, $exercicio): int {
            $contador = self::query()
                ->where('tenant_id', $tenantId)
                ->where('chave', $chave)
                ->where('exercicio', $exercicio)
                ->lockForUpdate()
                ->first();

            if ($contador === null) {
                $contador = self::create(['tenant_id' => $tenantId, 'chave' => $chave, 'exercicio' => $exercicio, 'valor' => 0]);
            }

            $contador->valor++;
            $contador->save();

            return $contador->valor;
        });
    }
}

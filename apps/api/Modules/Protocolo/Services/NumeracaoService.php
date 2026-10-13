<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Modules\Protocolo\Models\Sequencia;

final class NumeracaoService
{
    public function __construct(
        private readonly TenantContext $tenantContext
    ) {}

    /**
     * Gera o próximo número sequencial atômico para o tenant e ano informados.
     * DEVE ser executado dentro de uma transação de banco de dados ativa.
     */
    public function proximoNumero(int $ano, ?int $tenantId = null): int
    {
        $tenantId ??= $this->tenantContext->id();

        // Garante a existência do registro da sequência para o ano e tenant
        DB::table('protocolo_sequencias')->insertOrIgnore([
            'tenant_id' => $tenantId,
            'ano' => $ano,
            'ultimo_numero' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var Sequencia $sequencia */
        $sequencia = Sequencia::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('ano', $ano)
            ->lockForUpdate()
            ->firstOrFail();

        $proximo = $sequencia->ultimo_numero + 1;
        $sequencia->update(['ultimo_numero' => $proximo]);

        return $proximo;
    }
}

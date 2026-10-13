<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Listeners;

use App\Events\OutboxMessage;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Http;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;
use Modules\MeioAmbiente\Support\RepresentacaoIntegracao;

/**
 * Entrega ativa (push) a um órgão de controle. Qualquer falha (timeout, 5xx, 4xx)
 * propaga a exceção: o `outbox:process` registra o erro no evento e o reagenda com
 * backoff (até 5 tentativas, depois `failed`) — ver `App\Console\Commands\ProcessOutbox`.
 * Credencial revogada ou auto apagado não é falha: o envio é descartado sem retentativa.
 */
final class EnviarParaOrgaoControleListener
{
    private const TIMEOUT_SEGUNDOS = 15;

    public function __construct(private TenantContext $tenantContext) {}

    public function handle(OutboxMessage $mensagem): void
    {
        $evento = $mensagem->event;
        if ($evento->event_type !== IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO) {
            return;
        }

        $tenant = Tenant::find($evento->tenant_id);
        if ($tenant === null) {
            return;
        }
        // O `outbox:process` é um processo único que atravessa eventos de vários
        // tenants — o contexto é sempre limpo ao final para não vazar para o próximo.
        $this->tenantContext->set($tenant);
        try {
            $integracao = MeioAmbienteIntegracao::find($evento->payload['integracao_id'] ?? null);
            $auto = AutoInfracaoAmbiental::with(['documento.processoSancionatorio', 'empreendimento'])->find($evento->payload['auto_infracao_id'] ?? null);
            if ($integracao === null || $auto === null || ! $integracao->enviaAtivamente()) {
                return;
            }

            $requisicao = Http::timeout(self::TIMEOUT_SEGUNDOS)->acceptJson();
            if ($integracao->envio_token !== null) {
                $requisicao = $requisicao->withToken($integracao->envio_token);
            }

            $requisicao->post((string) $integracao->envio_url, [
                'evento' => 'auto_infracao_ambiental.emitido',
                'id_evento' => $evento->event_id,
                'orgao_emissor' => $tenant->name,
                'dados' => RepresentacaoIntegracao::autoInfracao($auto),
            ])->throw();
        } finally {
            $this->tenantContext->clear();
        }
    }
}

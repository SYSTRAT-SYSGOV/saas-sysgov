<?php

declare(strict_types=1);

namespace Modules\Pessoas\Listeners;

use App\Events\OutboxMessage;
use App\Models\Tenant;
use App\Support\TenantContext;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Services\SincronizacaoPessoaService;

/** Importação de pessoa a partir do sistema da prefeitura, assíncrona via Outbox. */
final class ImportarPessoaListener
{
    public const TIPO = 'pessoas.importar_pessoa';

    public function __construct(
        private readonly SincronizacaoPessoaService $sincronizacao,
        private readonly TenantContext $tenantContext,
    ) {}

    public function handle(OutboxMessage $mensagem): void
    {
        if ($mensagem->event->event_type !== self::TIPO) {
            return;
        }

        $integracao = PessoaIntegracao::find($mensagem->event->payload['integracao_id']);
        if (!$integracao) {
            return;
        }

        // outbox:process roda em console, sem tenant resolvido pela sessão HTTP —
        // os models TenantAware (Pessoa, PessoaSyncLog) exigem o contexto ativo.
        $tenant = Tenant::findOrFail($integracao->tenant_id);
        $this->tenantContext->set($tenant);

        try {
            $this->sincronizacao->sincronizar($integracao, (string) $mensagem->event->payload['cpf']);
        } finally {
            $this->tenantContext->clear();
        }
    }
}

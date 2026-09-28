<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoConfigService;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\PorTenant;

/** Diário 08:00 — verifica prazos de regularização sucessória e publica eventos na Outbox. */
final class VerificarPrazosSucessao extends Command
{
    protected $signature = 'sucessao:verificar-prazos';

    protected $description = 'Verifica prazos de regularização de sucessão hereditária e notifica gestores';

    public function handle(): int
    {
        PorTenant::executar(function ($tenant) {
            $config = app(SucessaoConfigService::class);
            $prazoDias = $config->getPrazoRegularizacaoDias();
            $antecedencias = $config->getNotificacaoAntecedenciaDias();

            $sucessoes = Sucessao::where('tenant_id', $tenant->id)
                ->whereIn('estado', [
                    'solicitada',
                    'em_analise',
                    'aguardando_documentos',
                    'validada',
                ])
                ->whereNotNull('data_falecimento')
                ->get();

            foreach ($sucessoes as $sucessao) {
                $diasFalecimento = $sucessao->data_falecimento?->diffInDays(now()) ?? 0;
                $diasRestantes = $prazoDias - $diasFalecimento;

                // Notificações de antecedência
                foreach ($antecedencias as $antecedencia) {
                    if ($diasRestantes === $antecedencia) {
                        app(\App\Support\OutboxPublisher::class)->publish('PrazoRegularizacaoProximo', [
                            'sucessao_id' => $sucessao->id,
                            'dias_restantes' => $diasRestantes,
                            'tenant_id' => $tenant->id,
                        ]);
                    }
                }

                // Prazo vencido
                if ($diasRestantes <= 0) {
                    app(\App\Support\OutboxPublisher::class)->publish('PrazoRegularizacaoVencido', [
                        'sucessao_id' => $sucessao->id,
                        'dias_atraso' => abs($diasRestantes),
                        'tenant_id' => $tenant->id,
                    ]);
                }
            }
        });

        return self::SUCCESS;
    }
}
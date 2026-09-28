<?php

declare(strict_types=1);

namespace Modules\Capd\Console;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Services\NotificacaoService;
use Modules\Capd\Support\PorTenant;

/**
 * Alerta de prazo (spec: automation › Alertas de Prazo): a 5 dias úteis do
 * fim da etapa de autoavaliação, notifica só quem ainda não submeteu.
 */
final class AlertarPrazoAvaliacao extends Command
{
    protected $signature = 'capd:alertar-prazo-avaliacao';

    protected $description = 'Notifica servidores com autoavaliação pendente a 5 dias úteis do prazo do ciclo';

    public function handle(NotificacaoService $notificacoes): int
    {
        $alvo = $this->em5DiasUteis(CarbonImmutable::today())->toDateString();

        PorTenant::executar(function () use ($notificacoes, $alvo): void {
            $ciclos = CicloAvaliacao::where('status', CicloAvaliacao::STATUS_ABERTO)
                ->whereDate('data_limite_preenchimento', $alvo)
                ->get();

            foreach ($ciclos as $ciclo) {
                $pendentes = Avaliacao::where('ciclo_id', $ciclo->id)->whereNull('data_conclusao')->get();

                foreach ($pendentes as $avaliacao) {
                    $notificacoes->enviar(
                        (string) $avaliacao->servidor_id,
                        "Faltam 5 dias úteis para o fim do prazo de autoavaliação do ciclo {$ciclo->nome}.",
                        ['ciclo_id' => $ciclo->id, 'avaliacao_id' => $avaliacao->id, 'data_limite' => $alvo],
                    );
                }
            }
        });

        return self::SUCCESS;
    }

    /** Conta dias úteis (desconsidera sábados e domingos), mesma lógica de LegalDeadlinesService. */
    private function em5DiasUteis(CarbonImmutable $referencia): CarbonImmutable
    {
        $data = $referencia;
        $adicionados = 0;
        while ($adicionados < 5) {
            $data = $data->addDay();
            if (! $data->isWeekend()) {
                $adicionados++;
            }
        }

        return $data;
    }
}

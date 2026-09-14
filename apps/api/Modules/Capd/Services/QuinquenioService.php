<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Modules\Capd\Models\Quinquenio;
use Modules\Capd\Models\Servidor;

/**
 * Quinquênios persistidos — RN-08 (art. 17, Lei 1.704/2006).
 *
 * Segregado das notas de desempenho: 5% de gratificação por quinquênio de
 * serviço efetivo, registrado de forma cadastral e idempotente.
 */
final class QuinquenioService
{
    private const PERCENTUAL_PADRAO = '5.00';

    /**
     * Gera os registros de quinquênios já completados desde a admissão do
     * servidor que ainda não existem. Idempotente: nunca duplica um
     * quinquênio já registrado para a mesma data.
     *
     * @return Collection<int, Quinquenio> — apenas os quinquênios recém-criados
     */
    public function gerarPendentes(Servidor $servidor, string $percentualPadrao = self::PERCENTUAL_PADRAO): Collection
    {
        if (! $servidor->data_admissao) {
            return collect();
        }

        $dataAdmissao   = Carbon::parse($servidor->data_admissao);
        $qtdCompletados = (int) floor($dataAdmissao->diffInYears(now()) / 5);

        $existentes = Quinquenio::query()
            ->where('servidor_id', $servidor->id)
            ->pluck('data_quinquenio')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->all();

        $criados = collect();

        for ($n = 1; $n <= $qtdCompletados; $n++) {
            $dataQuinquenio = $dataAdmissao->copy()->addYears($n * 5)->toDateString();

            if (in_array($dataQuinquenio, $existentes, true)) {
                continue;
            }

            $criados->push(Quinquenio::create([
                'tenant_id'       => $servidor->tenant_id,
                'servidor_id'     => $servidor->id,
                'data_quinquenio' => $dataQuinquenio,
                'percentual'      => $percentualPadrao,
            ]));
        }

        return $criados;
    }

    /**
     * @return Collection<int, Quinquenio>
     */
    public function listarPorServidor(int $servidorId): Collection
    {
        return Quinquenio::query()
            ->where('servidor_id', $servidorId)
            ->orderBy('data_quinquenio')
            ->get();
    }

    public function totalPercentual(int $servidorId): string
    {
        $soma = $this->listarPorServidor($servidorId)->reduce(
            fn (float $carry, Quinquenio $q) => $carry + (float) $q->percentual,
            0.0
        );

        return number_format($soma, 2, '.', '');
    }
}

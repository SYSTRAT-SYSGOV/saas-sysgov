<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaParada;
use Modules\Transporte\Support\ConflitoException;

/** Sequência ordenada de paradas da rota. As ordens são únicas por rota; toda renumeração passa por `gravarOrdem`. */
final class ItinerarioService
{
    /** Faixa temporária que não colide com nenhuma ordem real (D14). */
    private const DESLOCAMENTO = 100000;

    public function __construct(private readonly AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function adicionar(Rota $rota, int $paradaId, array $dados = []): RotaParada
    {
        return DB::transaction(function () use ($rota, $paradaId, $dados): RotaParada {
            Rota::query()->whereKey($rota->id)->lockForUpdate()->first();
            $parada = Parada::query()->find($paradaId);
            if ($parada === null) {
                throw new DomainException('Parada não encontrada.');
            }
            if (!$parada->ativa) {
                throw new DomainException('A parada está inativa.');
            }
            if (RotaParada::query()->where('rota_id', $rota->id)->where('parada_id', $paradaId)->exists()) {
                throw new ConflitoException('A parada já está no itinerário desta rota.');
            }
            $ordem = (int) RotaParada::query()->where('rota_id', $rota->id)->max('ordem') + 1;
            $item = RotaParada::create([
                'rota_id' => $rota->id,
                'parada_id' => $paradaId,
                'ordem' => $ordem,
                'embarque_previsto' => $dados['embarque_previsto'] ?? null,
                'desembarque_previsto' => $dados['desembarque_previsto'] ?? null,
            ]);
            $this->audit->record('transporte', 'itinerario.parada_adicionada', "rota:{$rota->id}", null, ['parada_id' => $paradaId, 'ordem' => $ordem]);

            return $item;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizarHorarios(Rota $rota, int $paradaId, array $dados): RotaParada
    {
        $item = RotaParada::query()->where('rota_id', $rota->id)->where('parada_id', $paradaId)->first();
        if ($item === null) {
            throw new DomainException('A parada não pertence ao itinerário desta rota.');
        }
        $antes = $item->toArray();
        $item->update([
            'embarque_previsto' => $dados['embarque_previsto'] ?? null,
            'desembarque_previsto' => $dados['desembarque_previsto'] ?? null,
        ]);
        $this->audit->record('transporte', 'itinerario.horarios_alterados', "rota:{$rota->id}", $antes, $item->toArray());

        return $item;
    }

    public function remover(Rota $rota, int $paradaId): void
    {
        DB::transaction(function () use ($rota, $paradaId): void {
            Rota::query()->whereKey($rota->id)->lockForUpdate()->first();
            $item = RotaParada::query()->where('rota_id', $rota->id)->where('parada_id', $paradaId)->first();
            if ($item === null) {
                throw new DomainException('A parada não pertence ao itinerário desta rota.');
            }
            $item->delete();
            $restantes = RotaParada::query()->where('rota_id', $rota->id)->orderBy('ordem')->pluck('parada_id')->map(fn ($id): int => (int) $id)->all();
            $this->gravarOrdem($rota, $restantes);
            $this->audit->record('transporte', 'itinerario.parada_removida', "rota:{$rota->id}", ['parada_id' => $paradaId], null);
        });
    }

    /**
     * Reordena de uma vez: recebe a lista completa e ordenada de `parada_id` do itinerário.
     *
     * @param list<int> $paradaIds
     */
    public function reordenar(Rota $rota, array $paradaIds): void
    {
        DB::transaction(function () use ($rota, $paradaIds): void {
            Rota::query()->whereKey($rota->id)->lockForUpdate()->first();
            $atuais = RotaParada::query()->where('rota_id', $rota->id)->orderBy('ordem')->pluck('parada_id')->map(fn ($id): int => (int) $id)->all();
            if (count($paradaIds) !== count(array_unique($paradaIds))) {
                throw new DomainException('A lista tem parada repetida.');
            }
            $sobra = array_diff($paradaIds, $atuais);
            $falta = array_diff($atuais, $paradaIds);
            if ($sobra !== [] || $falta !== []) {
                throw new DomainException('A lista deve conter exatamente as paradas do itinerário da rota.');
            }
            $this->gravarOrdem($rota, $paradaIds);
            $this->audit->record('transporte', 'itinerario.reordenado', "rota:{$rota->id}", ['ordem' => $atuais], ['ordem' => $paradaIds]);
        });
    }

    /**
     * Grava as ordens 1..n sem violar o único (rota_id, ordem) no meio da operação: primeiro desloca tudo para uma
     * faixa livre, depois grava as definitivas.
     *
     * @param list<int> $paradaIds
     */
    private function gravarOrdem(Rota $rota, array $paradaIds): void
    {
        RotaParada::query()->where('rota_id', $rota->id)->update(['ordem' => DB::raw('ordem + ' . self::DESLOCAMENTO)]);
        foreach ($paradaIds as $i => $paradaId) {
            RotaParada::query()->where('rota_id', $rota->id)->where('parada_id', $paradaId)->update(['ordem' => $i + 1]);
        }
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Geo\LeitorKml;
use Modules\Transporte\Geo\Percurso;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\RotaPercurso;

/** Percurso da rota importado de KML/KMZ: prévia sem gravar, gravação com km recalculados no servidor e remoção. */
final class PercursoService
{
    /** Pontos guardados por linha na prévia e no total gravado. */
    public const PONTOS_POR_LINHA = 3000;
    public const PONTOS_GRAVADOS = 5000;

    /** Retângulo do Brasil, só para avisar de arquivo trocado (por exemplo, coordenadas invertidas). */
    private const BRASIL = ['lat' => [-34.0, 6.0], 'lng' => [-74.5, -28.0]];

    public function __construct(private readonly LeitorKml $leitor, private readonly AuditLogger $audit) {}

    /** @return array<string, mixed> */
    public function previa(UploadedFile $arquivo): array
    {
        $lido = $this->leitor->ler((string) $arquivo->getRealPath());
        $linhas = [];
        $fora = 0;
        foreach ($lido['linhas'] as $i => $linha) {
            $simples = Percurso::simplificar($linha['pontos'], self::PONTOS_POR_LINHA);
            $fora += count(array_filter($simples, fn (array $p): bool => !$this->noBrasil($p)));
            $linhas[] = [
                'indice' => $i, 'nome' => $linha['nome'], 'pontos_no_arquivo' => count($linha['pontos']), 'pontos' => count($simples),
                'km' => Percurso::km($simples), 'coordenadas' => $this->arredondar($simples),
            ];
        }
        $ig = $lido['ignorados'];
        $avisos = [];
        if ($ig['pontos'] > 0) {
            $avisos[] = "{$ig['pontos']} ponto(s) de interesse foram ignorados (só as linhas entram no percurso).";
        }
        if ($ig['poligonos'] > 0) {
            $avisos[] = "{$ig['poligonos']} polígono(s) foram ignorados.";
        }
        if ($ig['pares_invalidos'] > 0) {
            $avisos[] = "{$ig['pares_invalidos']} par(es) de coordenadas inválidos foram descartados.";
        }
        if ($ig['linhas_curtas'] > 0) {
            $avisos[] = "{$ig['linhas_curtas']} linha(s) com menos de 2 pontos válidos foram descartadas.";
        }
        if ($fora > 0) {
            $avisos[] = 'Parte do traçado está fora do Brasil. Confira se o arquivo é da rota certa.';
        }

        return ['arquivo' => $arquivo->getClientOriginalName(), 'linhas' => $linhas, 'ignorados' => $ig, 'avisos' => $avisos];
    }

    /**
     * Os km são sempre recalculados aqui a partir das coordenadas recebidas; o que o cliente calculou não vale.
     *
     * @param list<array{0: float|int, 1: float|int}> $coordenadas
     * @return array<string, mixed>
     */
    public function gravar(Rota $rota, array $coordenadas, bool $aplicarKm, ?float $naoPavimentado, ?int $usuarioId): array
    {
        if (count($coordenadas) < 2) {
            throw new DomainException('O percurso precisa de ao menos dois pontos.');
        }
        if (count($coordenadas) > self::PONTOS_GRAVADOS + 1000) {
            throw new DomainException('O percurso tem pontos demais. Envie o arquivo de novo pela prévia.');
        }
        $pontos = array_map(static fn (array $p): array => [round((float) $p[0], 6), round((float) $p[1], 6)], $coordenadas);
        $pontos = count($pontos) > self::PONTOS_GRAVADOS ? Percurso::simplificar($pontos, self::PONTOS_GRAVADOS) : $pontos;
        $km = Percurso::km($pontos);
        $naoPav = $naoPavimentado ?? 0.0;
        if ($aplicarKm && $naoPav > $km) {
            throw new DomainException('A parte não pavimentada (' . number_format($naoPav, 2, ',', '.') . ' km) não pode passar do total do traçado (' . number_format($km, 2, ',', '.') . ' km).');
        }

        return DB::transaction(function () use ($rota, $pontos, $km, $aplicarKm, $naoPav, $usuarioId): array {
            $antes = ['km_pavimentado' => (float) $rota->km_pavimentado, 'km_nao_pavimentado' => (float) $rota->km_nao_pavimentado, 'tinha_percurso' => $rota->percurso()->exists()];
            RotaPercurso::query()->updateOrCreate(['rota_id' => $rota->id], [
                'coordenadas' => $pontos, 'pontos' => count($pontos), 'km' => $km, 'importado_por' => $usuarioId, 'importado_em' => now(),
            ]);
            if ($aplicarKm) {
                $rota->update(['km_pavimentado' => round($km - $naoPav, 2), 'km_nao_pavimentado' => round($naoPav, 2)]);
            }
            $depois = ['km_pavimentado' => (float) $rota->km_pavimentado, 'km_nao_pavimentado' => (float) $rota->km_nao_pavimentado, 'percurso_km' => $km, 'pontos' => count($pontos), 'aplicou_km' => $aplicarKm];
            $this->audit->record('transporte', 'rota.percurso_importado', "rota:{$rota->id}", $antes, $depois);

            return ['km' => $km, 'pontos' => count($pontos), 'km_pavimentado' => $depois['km_pavimentado'], 'km_nao_pavimentado' => $depois['km_nao_pavimentado'], 'aplicou_km' => $aplicarKm];
        });
    }

    /** @return array{coordenadas: list<array{0: float, 1: float}>, km: float, pontos: int, importado_em: string|null}|null */
    public function obter(Rota $rota): ?array
    {
        $p = $rota->percurso()->first();

        return $p === null ? null : ['coordenadas' => $p->coordenadas, 'km' => (float) $p->km, 'pontos' => $p->pontos, 'importado_em' => $p->importado_em->toIso8601String()];
    }

    public function remover(Rota $rota): void
    {
        $p = $rota->percurso()->first();
        if ($p === null) {
            throw new DomainException('Esta rota não tem percurso importado.');
        }
        DB::transaction(function () use ($rota, $p): void {
            $this->audit->record('transporte', 'rota.percurso_removido', "rota:{$rota->id}", ['percurso_km' => (float) $p->km, 'pontos' => $p->pontos], null);
            $p->delete();
        });
    }

    /**
     * @param list<array{0: float, 1: float}> $pontos
     * @return list<array{0: float, 1: float}>
     */
    private function arredondar(array $pontos): array
    {
        return array_map(static fn (array $p): array => [round($p[0], 6), round($p[1], 6)], $pontos);
    }

    /** @param array{0: float, 1: float} $p */
    private function noBrasil(array $p): bool
    {
        return $p[0] >= self::BRASIL['lat'][0] && $p[0] <= self::BRASIL['lat'][1] && $p[1] >= self::BRASIL['lng'][0] && $p[1] <= self::BRASIL['lng'][1];
    }
}

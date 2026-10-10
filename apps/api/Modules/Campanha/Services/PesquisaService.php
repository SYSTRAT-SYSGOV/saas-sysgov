<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Pesquisa;
use Modules\Campanha\Models\PesquisaResultado;
use Modules\Campanha\Services\Concerns\RegistraMutacao;

/** Pesquisas eleitorais com resultados estruturados e a evolução do candidato da campanha (D7). */
final class PesquisaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly MunicipioService $municipios,
    ) {}

    /**
     * @param array<string, mixed> $dados
     * @param list<array{nome: string, partido?: string|null, percentual_decimos: int, da_campanha?: bool}>|null $resultados null = não mexe
     */
    public function salvar(?Pesquisa $pesquisa, array $dados, ?array $resultados): Pesquisa
    {
        if (!empty($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if ($resultados !== null) {
            if ($resultados === []) {
                throw new DomainException('Informe ao menos um candidato com o percentual.');
            }
            if (array_sum(array_map(fn (array $r): int => (int) $r['percentual_decimos'], $resultados)) > 1000) {
                throw new DomainException('A soma dos percentuais passa de 100%.');
            }
            if (count(array_filter($resultados, fn (array $r): bool => (bool) ($r['da_campanha'] ?? false))) > 1) {
                throw new DomainException('Marque só um candidato como o da campanha.');
            }
        }

        return DB::transaction(function () use ($pesquisa, $dados, $resultados): Pesquisa {
            $antes = $pesquisa?->load('resultados')->toArray();
            $pesquisa ??= new Pesquisa();
            $pesquisa->fill($dados)->save();
            if ($resultados !== null) {
                $pesquisa->resultados()->delete();
                foreach ($resultados as $i => $r) {
                    PesquisaResultado::create([
                        'pesquisa_id' => $pesquisa->id, 'nome' => $r['nome'], 'partido' => $r['partido'] ?? null,
                        'percentual_decimos' => (int) $r['percentual_decimos'], 'da_campanha' => (bool) ($r['da_campanha'] ?? false), 'ordem' => $i,
                    ]);
                }
            }
            $pesquisa->load('resultados');
            $this->auditar('pesquisa', $antes === null ? 'criada' : 'atualizada', $pesquisa->id, $antes, $pesquisa->toArray());

            return $pesquisa;
        });
    }

    public function excluir(Pesquisa $pesquisa): void
    {
        DB::transaction(function () use ($pesquisa): void {
            $antes = $pesquisa->toArray();
            $pesquisa->delete();
            $this->auditar('pesquisa', 'excluida', $pesquisa->id, $antes, null);
        });
    }

    /**
     * Percentual do candidato da campanha em cada pesquisa da abrangência (null = estadual), por data.
     *
     * @return Collection<int, array{id: int, divulgada_em: string, instituto: string, tipo: string, percentual_decimos: int}>
     */
    public function evolucao(?int $codigoIbge): Collection
    {
        return Pesquisa::query()->with('resultados')
            ->when($codigoIbge === null, fn ($q) => $q->whereNull('codigo_ibge'), fn ($q) => $q->where('codigo_ibge', $codigoIbge))
            ->orderBy('divulgada_em')->orderBy('id')->get()
            ->map(function (Pesquisa $p): ?array {
                /** @var PesquisaResultado|null $nosso */
                $nosso = $p->resultados->first(fn (PesquisaResultado $r): bool => $r->da_campanha);

                return $nosso === null ? null : [
                    'id' => $p->id, 'divulgada_em' => $p->divulgada_em->toDateString(), 'instituto' => $p->instituto,
                    'tipo' => $p->tipo, 'percentual_decimos' => $nosso->percentual_decimos,
                ];
            })->filter()->values();
    }
}

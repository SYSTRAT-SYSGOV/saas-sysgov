<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;

/**
 * Base de eleitores da campanha de trabalho (D3): filtros, ficha, indicadores agregados, exportação e
 * exclusão auditadas, mapa de calor sem dado pessoal (D6) e anonimização por prazo (D5).
 * A auditoria nunca recebe os dados pessoais do eleitor.
 */
final class EleitorService
{
    use RegistraMutacao;

    /** Casas decimais do mapa de calor (~100 m) e da anonimização (~1 km). */
    public const CASAS_MAPA_CALOR = 3;

    public const CASAS_ANONIMIZADO = 2;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
        private readonly CampanhaContext $campanha,
    ) {}

    /**
     * @param array<string, mixed> $filtros codigo_ibge, bairro, coordenador_id, cabo_id, link_id, de, ate
     * @return Builder<Eleitor>
     */
    public function consulta(array $filtros): Builder
    {
        $q = Eleitor::query()->with(['coordenador', 'cabo']);
        foreach (['codigo_ibge', 'coordenador_id', 'cabo_id', 'link_id'] as $campo) {
            if (!empty($filtros[$campo])) {
                $q->where($campo, (int) $filtros[$campo]);
            }
        }
        if (!empty($filtros['bairro'])) {
            $q->where('bairro', 'like', '%' . $filtros['bairro'] . '%');
        }
        if (!empty($filtros['de'])) {
            $q->where('created_at', '>=', $filtros['de'] . ' 00:00:00');
        }
        if (!empty($filtros['ate'])) {
            $q->where('created_at', '<=', $filtros['ate'] . ' 23:59:59');
        }

        return $q->orderByDesc('created_at')->orderByDesc('id');
    }

    /**
     * Lista filtrada; a busca por nome/WhatsApp é feita depois de descriptografar (D3 — riscos).
     *
     * @param array<string, mixed> $filtros
     * @return Collection<int, array<string, mixed>>
     */
    public function listar(array $filtros): Collection
    {
        $busca = mb_strtolower(trim((string) ($filtros['busca'] ?? '')));
        $digitos = preg_replace('/\D/', '', $busca) ?? '';
        $nomes = $this->nomesMunicipios();

        return $this->consulta($filtros)->get()
            ->filter(fn (Eleitor $e): bool => $busca === ''
                || str_contains(mb_strtolower((string) $e->nome), $busca)
                || ($digitos !== '' && str_contains((string) $e->whatsapp, $digitos)))
            ->map(fn (Eleitor $e): array => $this->linha($e, $nomes))
            ->values();
    }

    /**
     * @param array<int, string> $nomes
     * @return array<string, mixed>
     */
    public function linha(Eleitor $e, array $nomes = []): array
    {
        $nomes = $nomes !== [] ? $nomes : $this->nomesMunicipios();

        return [
            ...$e->toArray(),
            'municipio' => $nomes[$e->codigo_ibge] ?? (string) $e->codigo_ibge,
            'responsavel' => $e->cabo_id !== null ? $e->cabo?->getAttribute('nome') : $e->coordenador?->getAttribute('nome'),
            'responsavel_tipo' => $e->cabo_id !== null ? 'cabo' : ($e->coordenador_id !== null ? 'coordenador' : null),
            'cabo' => null,
            'coordenador' => null,
        ];
    }

    /**
     * Totais sem dado pessoal (campanha.view).
     *
     * @return array<string, mixed>
     */
    public function indicadores(): array
    {
        $nomes = $this->nomesMunicipios();
        $porMunicipio = Eleitor::query()->select('codigo_ibge', DB::raw('count(*) as total'))->groupBy('codigo_ibge')->orderByDesc('total')->get()
            ->map(fn ($l): array => ['codigo_ibge' => (int) $l->codigo_ibge, 'municipio' => $nomes[(int) $l->codigo_ibge] ?? '', 'total' => (int) $l->getAttribute('total')]);
        $porResponsavel = Eleitor::query()->with(['coordenador', 'cabo'])->get(['id', 'coordenador_id', 'cabo_id'])
            ->groupBy(fn (Eleitor $e): string => $e->cabo_id !== null ? "cabo:{$e->cabo_id}" : ($e->coordenador_id !== null ? "coordenador:{$e->coordenador_id}" : 'sem'))
            ->map(function (Collection $grupo, string $chave): array {
                /** @var Eleitor $primeiro */
                $primeiro = $grupo->first();
                [$tipo] = explode(':', $chave);

                return [
                    'tipo' => $tipo === 'sem' ? null : $tipo,
                    'id' => $primeiro->cabo_id ?? $primeiro->coordenador_id,
                    'nome' => $primeiro->cabo_id !== null ? $primeiro->cabo?->getAttribute('nome') : ($primeiro->coordenador?->getAttribute('nome') ?? 'Sem responsável'),
                    'total' => $grupo->count(),
                ];
            })->sortByDesc('total')->values();

        return [
            'total' => Eleitor::query()->count(),
            'com_localizacao' => Eleitor::query()->whereNotNull('latitude')->count(),
            'ultimos_7_dias' => Eleitor::query()->where('created_at', '>=', now()->subDays(7))->count(),
            'anonimizados' => Eleitor::query()->whereNotNull('anonimizado_em')->count(),
            'por_municipio' => $porMunicipio,
            'por_responsavel' => $porResponsavel,
        ];
    }

    /**
     * Pontos do mapa de calor: coordenadas arredondadas e agregadas, só [lat, lng, peso] (D6).
     *
     * @return list<array{0: float, 1: float, 2: int}>
     */
    public function mapaCalor(): array
    {
        return Eleitor::query()->whereNotNull('latitude')->whereNotNull('longitude')->get(['latitude', 'longitude'])
            ->groupBy(fn (Eleitor $e): string => round((float) $e->latitude, self::CASAS_MAPA_CALOR) . ',' . round((float) $e->longitude, self::CASAS_MAPA_CALOR))
            ->map(function (Collection $grupo, string $chave): array {
                [$lat, $lng] = array_map('floatval', explode(',', $chave));

                return [$lat, $lng, $grupo->count()];
            })->values()->all();
    }

    /**
     * Linhas do CSV (cabeçalho incluído); a exportação fica na auditoria com a quantidade.
     *
     * @param array<string, mixed> $filtros
     * @return list<list<string|int|float|null>>
     */
    public function exportar(array $filtros): array
    {
        $linhas = $this->listar($filtros);
        $csv = [['ID', 'Cadastro', 'Nome', 'Município', 'Bairro', 'Zona', 'Seção', 'WhatsApp', 'Nascimento', 'Demanda', 'Responsável', 'Latitude', 'Longitude', 'Versão do termo', 'Consentimento em']];
        foreach ($linhas as $l) {
            $csv[] = [
                $l['id'], substr((string) $l['created_at'], 0, 10), $l['nome'], $l['municipio'], $l['bairro'], $l['zona'], $l['secao'], $l['whatsapp'],
                $l['data_nascimento'], $l['demanda'], $l['responsavel'], $l['latitude'], $l['longitude'], $l['consentimento_versao'],
                \Illuminate\Support\Carbon::parse((string) $l['consentido_em'])->timezone('America/Sao_Paulo')->format('d/m/Y H:i'),
            ];
        }
        DB::transaction(fn () => $this->auditar('eleitores', 'exportados', $this->campanha->id(), null, ['quantidade' => $linhas->count(), 'filtros' => array_keys(array_filter($filtros))]));

        return $csv;
    }

    /** Exclusão definitiva a pedido do titular; a auditoria guarda só o id e o município. */
    public function excluir(Eleitor $eleitor): void
    {
        DB::transaction(function () use ($eleitor): void {
            $id = $eleitor->id;
            $municipio = $eleitor->codigo_ibge;
            $eleitor->delete();
            $this->auditar('eleitor', 'excluido_a_pedido', $id, ['codigo_ibge' => $municipio], null);
        });
    }

    /**
     * Anonimiza os eleitores das campanhas encerradas cujo prazo de retenção venceu (D5). Idempotente.
     *
     * @return array<int, int> campanha_id => eleitores anonimizados
     */
    public function anonimizarVencidas(): array
    {
        $resultado = [];
        // Prazo vencido após o encerramento, ou campanha excluída (os eleitores não ficam órfãos com dados pessoais).
        $campanhas = Campanha::query()->withoutGlobalScopes()
            ->where(fn ($q) => $q->whereNotNull('deleted_at')->orWhere(fn ($q) => $q->where('status', 'encerrada')->whereNotNull('encerrada_em')))
            ->get()
            ->filter(fn (Campanha $c): bool => $c->trashed() || ($c->anonimizacaoPrevista()?->isPast() ?? false));
        foreach ($campanhas as $campanha) {
            $this->tenant->set(Tenant::query()->findOrFail($campanha->tenant_id));
            $this->campanha->set($campanha);
            try {
                $resultado[$campanha->id] = $this->anonimizarCampanha();
            } finally {
                $this->campanha->clear();
                $this->tenant->clear();
            }
        }

        return $resultado;
    }

    private function anonimizarCampanha(): int
    {
        $total = 0;
        Eleitor::query()->whereNull('anonimizado_em')->chunkById(500, function (Collection $lote) use (&$total): void {
            DB::transaction(function () use ($lote, &$total): void {
                foreach ($lote as $eleitor) {
                    /** @var Eleitor $eleitor */
                    $eleitor->fill(array_fill_keys(Eleitor::CAMPOS_PESSOAIS, null));
                    $eleitor->latitude = $eleitor->latitude !== null ? round((float) $eleitor->latitude, self::CASAS_ANONIMIZADO) : null;
                    $eleitor->longitude = $eleitor->longitude !== null ? round((float) $eleitor->longitude, self::CASAS_ANONIMIZADO) : null;
                    $eleitor->precisao_m = null;
                    $eleitor->anonimizado_em = now();
                    $eleitor->save();
                    $total++;
                }
            });
        });
        if ($total > 0) {
            DB::transaction(fn () => $this->auditar('eleitores', 'anonimizados', $this->campanha->id(), null, ['quantidade' => $total]));
        }

        return $total;
    }

    /** @return array<int, string> */
    private function nomesMunicipios(): array
    {
        return RefMunicipio::query()->where('uf', $this->campanha->get()->uf)->pluck('nome', 'codigo_ibge')->all();
    }
}

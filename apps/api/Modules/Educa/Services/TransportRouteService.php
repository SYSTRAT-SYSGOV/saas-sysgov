<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaTransportRoute;
use Modules\Educa\Models\EducaTransportStop;

/**
 * Gestão de Rotas, Itinerários, Paradas Ordenadas e Vinculação de Escolas.
 */
final class TransportRouteService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     turno?: string|null,
     *     tipo_rota?: string|null,
     *     ativo?: bool|null,
     *     busca?: string|null
     * } $filtros
     * @return Collection<int, EducaTransportRoute>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaTransportRoute::query()
            ->with(['stops', 'schools']);

        if (! empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }

        if (! empty($filtros['tipo_rota'])) {
            $query->where('tipo_rota', $filtros['tipo_rota']);
        }

        if (isset($filtros['ativo']) && $filtros['ativo'] !== null) {
            $query->where('ativo', (bool) $filtros['ativo']);
        }

        if (! empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('codigo', 'like', "%{$busca}%")
                    ->orWhere('nome', 'like', "%{$busca}%");
            });
        }

        return $query->orderBy('codigo')->get();
    }

    public function obter(string $rotaId): EducaTransportRoute
    {
        return EducaTransportRoute::query()
            ->with(['stops', 'schools'])
            ->findOrFail($rotaId);
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     codigo: string,
     *     nome: string,
     *     turno: string,
     *     tipo_rota: string,
     *     quilometragem_estimada?: float|null,
     *     horario_saida?: string|null,
     *     horario_chegada?: string|null,
     *     ativo?: bool|null
     * } $dados
     */
    public function criar(array $dados): EducaTransportRoute
    {
        $codigoExistente = EducaTransportRoute::query()
            ->where('codigo', $dados['codigo'])
            ->exists();

        if ($codigoExistente) {
            throw new LogicException("Já existe uma rota com o código {$dados['codigo']} para este município.");
        }

        return DB::transaction(function () use ($dados): EducaTransportRoute {
            $rota = EducaTransportRoute::create($dados);
            $rota->load(['stops', 'schools']);

            $this->audit->record('educa', 'transport_route.created', "EducaTransportRoute #{$rota->id}", null, $rota->toArray());

            return $rota;
        });
    }

    /**
     * @param array{
     *     nome?: string|null,
     *     turno?: string|null,
     *     tipo_rota?: string|null,
     *     quilometragem_estimada?: float|null,
     *     horario_saida?: string|null,
     *     horario_chegada?: string|null,
     *     ativo?: bool|null
     * } $dados
     */
    public function atualizar(string $rotaId, array $dados): EducaTransportRoute
    {
        $rota = $this->obter($rotaId);
        $antes = $rota->toArray();

        return DB::transaction(function () use ($rota, $dados, $antes): EducaTransportRoute {
            $rota->update(array_filter($dados, fn ($val) => $val !== null));
            $rota->load(['stops', 'schools']);

            $this->audit->record('educa', 'transport_route.updated', "EducaTransportRoute #{$rota->id}", $antes, $rota->toArray());

            return $rota;
        });
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     ordem?: int|null,
     *     nome: string,
     *     referencia?: string|null,
     *     latitude?: float|null,
     *     longitude?: float|null,
     *     horario_estimado?: string|null
     * } $dados
     */
    public function adicionarParada(string $rotaId, array $dados): EducaTransportStop
    {
        $rota = $this->obter($rotaId);

        return DB::transaction(function () use ($rota, $dados): EducaTransportStop {
            if (! isset($dados['ordem']) || $dados['ordem'] === null) {
                $maxOrdem = (int) EducaTransportStop::query()
                    ->where('route_id', $rota->id)
                    ->max('ordem');
                $dados['ordem'] = $maxOrdem + 1;
            }

            $dados['route_id'] = $rota->id;
            $parada = EducaTransportStop::create($dados);

            $this->audit->record('educa', 'transport_stop.created', "EducaTransportStop #{$parada->id}", null, $parada->toArray());

            return $parada;
        });
    }

    /**
     * @param array<int, string> $escolaIds
     */
    public function vincularEscolas(string $rotaId, array $escolaIds): void
    {
        $rota = $this->obter($rotaId);

        // Valida se as escolas existem no tenant
        $validas = EducaSchool::query()->whereIn('id', $escolaIds)->pluck('id')->all();

        DB::transaction(function () use ($rota, $validas): void {
            $rota->schools()->sync($validas);
            $this->audit->record('educa', 'transport_route.schools_synced', "EducaTransportRoute #{$rota->id}", null, ['schools' => $validas]);
        });
    }
}

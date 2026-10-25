<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaTransportInspection;
use Modules\Educa\Models\EducaTransportVehicle;

/**
 * Gestão da Frota Escolar e Controle Semestral de Vistorias do DETRAN.
 */
final class TransportVehicleService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     tipologia?: string|null,
     *     tipo_propriedade?: string|null,
     *     status?: string|null,
     *     busca?: string|null
     * } $filtros
     * @return Collection<int, EducaTransportVehicle>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaTransportVehicle::query()
            ->with(['latestInspection']);

        if (! empty($filtros['tipologia'])) {
            $query->where('tipologia', $filtros['tipologia']);
        }

        if (! empty($filtros['tipo_propriedade'])) {
            $query->where('tipo_propriedade', $filtros['tipo_propriedade']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (! empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('placa', 'like', "%{$busca}%")
                    ->orWhere('marca_modelo', 'like', "%{$busca}%")
                    ->orWhere('renavam', 'like', "%{$busca}%");
            });
        }

        return $query->orderBy('placa')->get();
    }

    public function obter(string $veiculoId): EducaTransportVehicle
    {
        return EducaTransportVehicle::query()
            ->with(['inspections', 'latestInspection'])
            ->findOrFail($veiculoId);
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     placa: string,
     *     marca_modelo: string,
     *     ano_fabricacao: int,
     *     tipologia: string,
     *     tipo_propriedade: string,
     *     capacidade_passageiros: int,
     *     renavam?: string|null,
     *     status?: string|null
     * } $dados
     */
    public function criar(array $dados): EducaTransportVehicle
    {
        $dados['placa'] = strtoupper(trim($dados['placa']));

        $placaExiste = EducaTransportVehicle::query()
            ->where('placa', $dados['placa'])
            ->exists();

        if ($placaExiste) {
            throw new LogicException("Já existe um veículo cadastrado com a placa {$dados['placa']} neste município.");
        }

        return DB::transaction(function () use ($dados): EducaTransportVehicle {
            $veiculo = EducaTransportVehicle::create($dados);
            $veiculo->load(['inspections', 'latestInspection']);

            $this->audit->record('educa', 'transport_vehicle.created', "EducaTransportVehicle #{$veiculo->id}", null, $veiculo->toArray());

            return $veiculo;
        });
    }

    /**
     * @param array{
     *     marca_modelo?: string|null,
     *     tipologia?: string|null,
     *     tipo_propriedade?: string|null,
     *     capacidade_passageiros?: int|null,
     *     renavam?: string|null,
     *     status?: string|null
     * } $dados
     */
    public function atualizar(string $veiculoId, array $dados): EducaTransportVehicle
    {
        $veiculo = $this->obter($veiculoId);
        $antes = $veiculo->toArray();

        return DB::transaction(function () use ($veiculo, $dados, $antes): EducaTransportVehicle {
            $veiculo->update(array_filter($dados, fn ($val) => $val !== null));
            $veiculo->load(['inspections', 'latestInspection']);

            $this->audit->record('educa', 'transport_vehicle.updated', "EducaTransportVehicle #{$veiculo->id}", $antes, $veiculo->toArray());

            return $veiculo;
        });
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     numero_laudo: string,
     *     orgao_emissor?: string|null,
     *     data_vistoria: string,
     *     data_validade: string,
     *     resultado?: string|null,
     *     observacoes?: string|null
     * } $dados
     */
    public function registrarVistoria(string $veiculoId, array $dados): EducaTransportInspection
    {
        $veiculo = $this->obter($veiculoId);

        return DB::transaction(function () use ($veiculo, $dados): EducaTransportInspection {
            $dados['vehicle_id'] = $veiculo->id;
            $dados['orgao_emissor'] = $dados['orgao_emissor'] ?? 'DETRAN';
            $dados['resultado'] = $dados['resultado'] ?? EducaTransportInspection::RESULTADO_APROVADO;

            $vistoria = EducaTransportInspection::create($dados);

            // Se laudo for reprovado, marca status do veículo como interditado preventivamente
            if ($vistoria->resultado === EducaTransportInspection::RESULTADO_REPROVADO) {
                $veiculo->update(['status' => EducaTransportVehicle::STATUS_INTERDITADO]);
            } elseif ($vistoria->resultado === EducaTransportInspection::RESULTADO_APROVADO && Carbon::parse($vistoria->data_validade)->isFuture()) {
                if ($veiculo->status === EducaTransportVehicle::STATUS_INTERDITADO) {
                    $veiculo->update(['status' => EducaTransportVehicle::STATUS_REGULAR]);
                }
            }

            $this->audit->record('educa', 'transport_inspection.created', "EducaTransportInspection #{$vistoria->id}", null, $vistoria->toArray());

            return $vistoria;
        });
    }

    /**
     * Verifica se o veículo está com status regular e com vistoria semestral válida do DETRAN.
     */
    public function validarAptoParaOperacao(string $veiculoId): bool
    {
        $veiculo = $this->obter($veiculoId);

        if ($veiculo->status !== EducaTransportVehicle::STATUS_REGULAR) {
            return false;
        }

        return $veiculo->temVistoriaValida();
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaStudentProfile;
use Modules\Educa\Models\EducaTransportRoute;
use Modules\Educa\Models\EducaTransportStop;
use Modules\Educa\Models\EducaTransportStudentAllocation;
use Modules\Educa\Models\EducaTransportVehicle;

/**
 * Alocação Nominal de Estudantes com Trava Pessimista de Assentos (lockForUpdate).
 */
final class TransportAllocationService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     route_id?: string|null,
     *     vehicle_id?: string|null,
     *     enrollment_id?: string|null,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaTransportStudentAllocation>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaTransportStudentAllocation::query()
            ->with(['route', 'vehicle', 'stop', 'enrollment.alunoPessoa', 'alunoPessoa']);

        if (! empty($filtros['route_id'])) {
            $query->where('route_id', $filtros['route_id']);
        }

        if (! empty($filtros['vehicle_id'])) {
            $query->where('vehicle_id', $filtros['vehicle_id']);
        }

        if (! empty($filtros['enrollment_id'])) {
            $query->where('enrollment_id', $filtros['enrollment_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function obter(string $alocacaoId): EducaTransportStudentAllocation
    {
        return EducaTransportStudentAllocation::query()
            ->with(['route', 'vehicle', 'stop', 'enrollment.alunoPessoa', 'alunoPessoa'])
            ->findOrFail($alocacaoId);
    }

    /**
     * Aloca nominalmente um estudante em rota e veículo com trava concorrente e controle de assentos.
     *
     * @param array{
     *     tenant_id: int,
     *     route_id: string,
     *     vehicle_id: string,
     *     stop_id: string,
     *     enrollment_id: string,
     *     data_inicio: string
     * } $dados
     */
    public function alocar(array $dados): EducaTransportStudentAllocation
    {
        $rota = EducaTransportRoute::findOrFail($dados['route_id']);
        if (! $rota->ativo) {
            throw new LogicException('A rota selecionada está inativa.');
        }

        $parada = EducaTransportStop::where('route_id', $rota->id)
            ->findOrFail($dados['stop_id']);

        $matricula = EducaEnrollment::findOrFail($dados['enrollment_id']);
        if ($matricula->status !== EducaEnrollment::STATUS_ATIVA) {
            throw new LogicException('Apenas estudantes com matrícula ativa podem ser alocados no transporte escolar.');
        }

        // Verifica duplicidade de alocação ativa para a mesma matrícula na mesma rota
        $alocacaoAtiva = EducaTransportStudentAllocation::query()
            ->where('enrollment_id', $matricula->id)
            ->where('route_id', $rota->id)
            ->where('status', EducaTransportStudentAllocation::STATUS_ATIVA)
            ->exists();

        if ($alocacaoAtiva) {
            throw new LogicException('O estudante já possui uma alocação ativa nesta rota.');
        }

        return DB::transaction(function () use ($dados, $rota, $parada, $matricula): EducaTransportStudentAllocation {
            /** @var EducaTransportVehicle $veiculo */
            $veiculo = EducaTransportVehicle::query()
                ->where('id', $dados['vehicle_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($veiculo->status !== EducaTransportVehicle::STATUS_REGULAR) {
                throw new LogicException("O veículo {$veiculo->placa} está {$veiculo->status} e não pode receber novas alocações.");
            }

            if (! $veiculo->temVistoriaValida()) {
                throw new LogicException("O veículo {$veiculo->placa} não possui laudo de vistoria semestral válido do DETRAN.");
            }

            if ($veiculo->ocupacao_efetiva >= $veiculo->capacidade_passageiros) {
                throw new LogicException("A capacidade máxima do veículo ({$veiculo->capacidade_passageiros} assentos) já foi atingida.");
            }

            $dados['aluno_pessoa_id'] = $matricula->aluno_pessoa_id;
            $dados['status'] = EducaTransportStudentAllocation::STATUS_ATIVA;

            $alocacao = EducaTransportStudentAllocation::create($dados);

            // Incrementa atomicamente a ocupação efetiva do veículo
            $veiculo->increment('ocupacao_efetiva');

            // Sincroniza a ficha complementar do aluno para indicar uso de transporte escolar público
            EducaStudentProfile::query()
                ->where('pessoa_id', $matricula->aluno_pessoa_id)
                ->update(['transporte_escolar_publico' => true]);

            $alocacao->load(['route', 'vehicle', 'stop', 'enrollment.alunoPessoa', 'alunoPessoa']);

            $this->audit->record('educa', 'transport_allocation.created', "EducaTransportStudentAllocation #{$alocacao->id}", null, $alocacao->toArray());

            return $alocacao;
        });
    }

    /**
     * Encerra a alocação de transporte liberando a vaga no veículo.
     */
    public function encerrar(string $alocacaoId, ?string $dataFim = null): EducaTransportStudentAllocation
    {
        return DB::transaction(function () use ($alocacaoId, $dataFim): EducaTransportStudentAllocation {
            /** @var EducaTransportStudentAllocation $alocacao */
            $alocacao = EducaTransportStudentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($alocacaoId);

            if ($alocacao->status === EducaTransportStudentAllocation::STATUS_ENCERRADA) {
                return $alocacao;
            }

            /** @var EducaTransportVehicle|null $veiculo */
            $veiculo = EducaTransportVehicle::query()
                ->where('id', $alocacao->vehicle_id)
                ->lockForUpdate()
                ->first();

            $alocacao->update([
                'status' => EducaTransportStudentAllocation::STATUS_ENCERRADA,
                'data_fim' => $dataFim ?? now()->toDateString(),
            ]);

            if ($veiculo && $veiculo->ocupacao_efetiva > 0) {
                $veiculo->decrement('ocupacao_efetiva');
            }

            $alocacao->load(['route', 'vehicle', 'stop', 'enrollment.alunoPessoa', 'alunoPessoa']);

            $this->audit->record('educa', 'transport_allocation.closed', "EducaTransportStudentAllocation #{$alocacao->id}", null, $alocacao->toArray());

            return $alocacao;
        });
    }
}

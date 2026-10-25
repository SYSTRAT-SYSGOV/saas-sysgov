<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaTransfer;

/**
 * Serviço de Negócio para Transferências Escolares e Saídas de Rede.
 */
final class TransferService
{
    public function __construct(
        private readonly ClassEnrollmentService $classEnrollmentService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Registra a transferência do estudante para fora da rede municipal de ensino,
     * liberando a vaga na turma e alterando o status da matrícula.
     *
     * @param array{
     *     data_transferencia: string,
     *     motivo: string,
     *     escola_destino_externa?: string|null,
     *     municipio_destino_externo?: string|null,
     *     uf_destino_externo?: string|null
     * } $dados
     */
    public function transferirParaForaDaRede(EducaEnrollment $matricula, array $dados): EducaTransfer
    {
        if ($matricula->status !== EducaEnrollment::STATUS_ATIVA) {
            throw ValidationException::withMessages([
                'matricula' => ["Apenas matrículas ativas podem ser transferidas. Status atual: {$matricula->status}."],
            ]);
        }

        return DB::transaction(function () use ($matricula, $dados): EducaTransfer {
            $enturmacaoAtiva = $matricula->enturmacaoAtiva;
            $turmaOrigemId = $enturmacaoAtiva?->school_class_id;

            // 1. Liberação de vaga na turma de origem se houver enturmação ativa
            if ($enturmacaoAtiva !== null) {
                $this->classEnrollmentService->desenturmar($enturmacaoAtiva, $dados['data_transferencia']);
            }

            // 2. Atualização do status da matrícula
            $matriculaAntes = $matricula->toArray();
            $matricula->update([
                'status' => EducaEnrollment::STATUS_TRANSFERIDA,
            ]);

            // 3. Registro formal de transferência
            $transfer = EducaTransfer::create([
                'tenant_id' => $matricula->tenant_id,
                'enrollment_id' => $matricula->id,
                'tipo' => EducaTransfer::TIPO_SAIDA_REDE,
                'turma_origem_id' => $turmaOrigemId,
                'turma_destino_id' => null,
                'escola_destino_externa' => $dados['escola_destino_externa'] ?? null,
                'municipio_destino_externo' => $dados['municipio_destino_externo'] ?? null,
                'uf_destino_externo' => $dados['uf_destino_externo'] ?? null,
                'data_transferencia' => $dados['data_transferencia'],
                'motivo' => $dados['motivo'],
            ]);

            $this->audit->record(
                'educa',
                'enrollment.transferred_out',
                "EducaEnrollment #{$matricula->id}",
                $matriculaAntes,
                [
                    'transfer_id' => $transfer->id,
                    'escola_destino' => $dados['escola_destino_externa'] ?? null,
                    'data_transferencia' => $dados['data_transferencia'],
                ]
            );

            return $transfer;
        });
    }
}

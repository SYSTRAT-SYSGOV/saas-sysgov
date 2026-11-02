<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Models\ManutencaoPrevista;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\ConflitoException;

/** Manutenção prevista por data e/ou quilometragem; vira alerta e pode ser convertida em ordem de serviço (design D-M4). */
final class ManutencaoPrevistaService
{
    public function __construct(private readonly OrdemServicoService $ordens, private readonly AuditLogger $audit) {}

    /** @param array{veiculo_id: int, descricao: string, data_prevista?: string|null, km_previsto?: int|null} $dados */
    public function criar(array $dados): ManutencaoPrevista
    {
        $data = $dados['data_prevista'] ?? null;
        $km = $dados['km_previsto'] ?? null;
        if ($data === null && $km === null) {
            throw new DomainException('Informe a data prevista, a quilometragem prevista ou as duas.');
        }
        $veiculo = Veiculo::query()->find($dados['veiculo_id']) ?? throw new DomainException('Veículo não encontrado.');

        $prevista = ManutencaoPrevista::create([
            'veiculo_id' => $veiculo->id, 'descricao' => trim($dados['descricao']), 'data_prevista' => $data, 'km_previsto' => $km, 'status' => 'pendente',
        ]);
        $this->audit->record('transporte', 'manutencao_prevista.criada', "manutencao_prevista:{$prevista->id}", null, $prevista->toArray());

        return $prevista;
    }

    public function cancelar(ManutencaoPrevista $prevista): ManutencaoPrevista
    {
        $this->exigirPendente($prevista);
        $prevista->update(['status' => 'cancelada']);
        $this->audit->record('transporte', 'manutencao_prevista.cancelada', "manutencao_prevista:{$prevista->id}", null, $prevista->toArray());

        return $prevista;
    }

    /** Abre uma ordem de serviço com os dados da previsão e marca a previsão como convertida. */
    public function converter(ManutencaoPrevista $prevista, ?int $fornecedorId, ?int $usuarioId): OrdemServico
    {
        $this->exigirPendente($prevista);

        return DB::transaction(function () use ($prevista, $fornecedorId, $usuarioId): OrdemServico {
            $ordem = $this->ordens->abrir([
                'veiculo_id' => $prevista->veiculo_id, 'fornecedor_id' => $fornecedorId, 'tipo' => 'preventiva', 'descricao' => $prevista->descricao,
                'aberta_em' => today()->toDateString(), 'km' => null, 'valor' => null,
            ], $usuarioId);
            $prevista->update(['status' => 'convertida', 'ordem_servico_id' => $ordem->id]);
            $this->audit->record('transporte', 'manutencao_prevista.convertida', "manutencao_prevista:{$prevista->id}", null, ['ordem_servico_id' => $ordem->id]);

            return $ordem;
        });
    }

    private function exigirPendente(ManutencaoPrevista $prevista): void
    {
        if ($prevista->status !== 'pendente') {
            throw new ConflitoException('Esta manutenção prevista já foi ' . ($prevista->status === 'convertida' ? 'convertida em ordem de serviço' : 'cancelada') . '.');
        }
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\Fornecedor;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\ConflitoException;

/**
 * Ordens de serviço da frota (design D-M3). Ordem aberta deixa o veículo "em manutenção"; concluída ou cancelada não é
 * editada. Concluir confere data e quilometragem e atualiza o hodômetro do veículo.
 */
final class OrdemServicoService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @param array<string, mixed> $dados veiculo_id, fornecedor_id, tipo, descricao, aberta_em, km, valor */
    public function abrir(array $dados, ?int $usuarioId): OrdemServico
    {
        return DB::transaction(function () use ($dados, $usuarioId): OrdemServico {
            $veiculo = Veiculo::query()->find($dados['veiculo_id']) ?? throw new DomainException('Veículo não encontrado.');
            $this->conferirFornecedor($dados['fornecedor_id'] ?? null);
            $this->conferirTipo((string) $dados['tipo']);
            $this->conferirData((string) $dados['aberta_em'], 'A data de abertura');

            $ordem = OrdemServico::create([
                'veiculo_id' => $veiculo->id, 'fornecedor_id' => $dados['fornecedor_id'] ?? null, 'tipo' => $dados['tipo'],
                'descricao' => trim((string) $dados['descricao']), 'aberta_em' => $dados['aberta_em'], 'km' => $dados['km'] ?? null,
                'valor' => $dados['valor'] ?? null, 'status' => 'aberta', 'criada_por' => $usuarioId,
            ]);
            $this->audit->record('transporte', 'ordem_servico.aberta', "ordem_servico:{$ordem->id}", null, $this->resumo($ordem));

            return $ordem;
        });
    }

    /** @param array<string, mixed> $dados fornecedor_id, tipo, descricao, aberta_em, km, valor (o veículo não muda) */
    public function atualizar(OrdemServico $ordem, array $dados): OrdemServico
    {
        $this->exigirAberta($ordem);

        return DB::transaction(function () use ($ordem, $dados): OrdemServico {
            $antes = $this->resumo($ordem);
            $this->conferirFornecedor($dados['fornecedor_id'] ?? null);
            $this->conferirTipo((string) $dados['tipo']);
            $this->conferirData((string) $dados['aberta_em'], 'A data de abertura');
            $ordem->update([
                'fornecedor_id' => $dados['fornecedor_id'] ?? null, 'tipo' => $dados['tipo'], 'descricao' => trim((string) $dados['descricao']),
                'aberta_em' => $dados['aberta_em'], 'km' => $dados['km'] ?? null, 'valor' => $dados['valor'] ?? null,
            ]);
            $this->audit->record('transporte', 'ordem_servico.alterada', "ordem_servico:{$ordem->id}", $antes, $this->resumo($ordem));

            return $ordem;
        });
    }

    /** @param array{concluida_em: string, km?: int|null, valor?: string|float|int|null} $dados */
    public function concluir(OrdemServico $ordem, array $dados): OrdemServico
    {
        $this->exigirAberta($ordem);

        return DB::transaction(function () use ($ordem, $dados): OrdemServico {
            $this->conferirData((string) $dados['concluida_em'], 'A data de conclusão');
            if ($ordem->aberta_em->toDateString() > $dados['concluida_em']) {
                throw new DomainException('A conclusão não pode ser anterior à abertura (' . $ordem->aberta_em->format('d/m/Y') . ').');
            }
            $veiculo = Veiculo::query()->lockForUpdate()->findOrFail($ordem->veiculo_id);
            $km = $dados['km'] ?? $ordem->km;
            if ($km !== null && $veiculo->km_atual !== null && $km < $veiculo->km_atual) {
                throw new DomainException("A quilometragem informada ({$km} km) é menor que a atual do veículo ({$veiculo->km_atual} km).");
            }

            $antes = $this->resumo($ordem);
            $ordem->update(['status' => 'concluida', 'concluida_em' => $dados['concluida_em'], 'km' => $km, 'valor' => $dados['valor'] ?? $ordem->valor]);
            if ($km !== null && ($veiculo->km_atual === null || $km > $veiculo->km_atual)) {
                $veiculo->update(['km_atual' => $km, 'km_atualizado_em' => now()]);
            }
            $this->audit->record('transporte', 'ordem_servico.concluida', "ordem_servico:{$ordem->id}", $antes, $this->resumo($ordem));

            return $ordem;
        });
    }

    public function cancelar(OrdemServico $ordem, ?string $motivo): OrdemServico
    {
        $this->exigirAberta($ordem);
        $antes = $this->resumo($ordem);
        $ordem->update(['status' => 'cancelada', 'motivo_cancelamento' => $motivo !== null && trim($motivo) !== '' ? trim($motivo) : null]);
        $this->audit->record('transporte', 'ordem_servico.cancelada', "ordem_servico:{$ordem->id}", $antes, $this->resumo($ordem));

        return $ordem;
    }

    public function veiculoEmManutencao(int $veiculoId): bool
    {
        return OrdemServico::query()->where('veiculo_id', $veiculoId)->where('status', 'aberta')->exists();
    }

    private function exigirAberta(OrdemServico $ordem): void
    {
        if ($ordem->status !== 'aberta') {
            throw new ConflitoException('Só ordens abertas podem ser alteradas: esta já foi ' . strtolower(Catalogo::STATUS_OS[$ordem->status] ?? $ordem->status) . '. Registre uma nova ordem para corrigir.');
        }
    }

    private function conferirFornecedor(mixed $id): void
    {
        if ($id === null) {
            return;
        }
        $fornecedor = Fornecedor::query()->find($id) ?? throw new DomainException('Fornecedor não encontrado.');
        if (!$fornecedor->ativo) {
            throw new ConflitoException('O fornecedor está inativo.');
        }
    }

    private function conferirTipo(string $tipo): void
    {
        if (!isset(Catalogo::TIPOS_OS[$tipo])) {
            throw new DomainException('Tipo de serviço inválido.');
        }
    }

    private function conferirData(string $data, string $rotulo): void
    {
        if ($data > today()->toDateString()) {
            throw new DomainException("{$rotulo} não pode ser futura.");
        }
    }

    /** @return array<string, mixed> */
    private function resumo(OrdemServico $o): array
    {
        return [
            'veiculo_id' => $o->veiculo_id, 'fornecedor_id' => $o->fornecedor_id, 'tipo' => $o->tipo, 'status' => $o->status,
            'aberta_em' => $o->aberta_em->toDateString(), 'concluida_em' => $o->concluida_em?->toDateString(), 'km' => $o->km, 'valor' => $o->valor,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\ConflitoException;

final class RotaService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function salvar(?Rota $rota, array $dados): Rota
    {
        if (Escola::query()->whereKey($dados['escola_id'])->doesntExist()) {
            throw new DomainException('Escola de destino não encontrada.');
        }

        return DB::transaction(function () use ($rota, $dados): Rota {
            $antes = $rota?->toArray();
            $empresaId = $dados['empresa_id'] ?? null;
            $veiculoId = $dados['veiculo_id'] ?? null;
            $motoristaId = $dados['motorista_id'] ?? null;

            // Só confere o que foi trocado: renomear uma rota que ficou irregular depois não pode ser barrado (D13).
            if ($rota === null || $rota->empresa_id !== $empresaId) {
                $this->conferirEmpresa($empresaId);
            }
            if ($rota === null || $rota->veiculo_id !== $veiculoId) {
                $this->conferirVeiculo($veiculoId);
            }
            if ($rota === null || $rota->motorista_id !== $motoristaId) {
                $this->conferirMotorista($motoristaId);
            }

            $campos = [
                'escola_id' => $dados['escola_id'],
                'ano_letivo' => $dados['ano_letivo'],
                'empresa_id' => $empresaId,
                'veiculo_id' => $veiculoId,
                'motorista_id' => $motoristaId,
                'nome' => $dados['nome'],
                'turno' => $dados['turno'],
                'tipo_rede' => $dados['tipo_rede'],
                'km_pavimentado' => $dados['km_pavimentado'] ?? 0,
                'km_nao_pavimentado' => $dados['km_nao_pavimentado'] ?? 0,
                'horario_saida' => $dados['horario_saida'] ?? null,
                'horario_chegada' => $dados['horario_chegada'] ?? null,
                'horario_retorno' => $dados['horario_retorno'] ?? null,
                'ativa' => $dados['ativa'] ?? true,
                'observacoes' => $dados['observacoes'] ?? null,
            ];
            $rota = $rota === null ? Rota::create($campos) : tap($rota)->update($campos);
            $this->audit->record('transporte', $antes === null ? 'rota.criada' : 'rota.alterada', "rota:{$rota->id}", $antes, $rota->toArray());

            return $rota;
        });
    }

    /** Exclusão lógica. A Fase 3 passa a bloquear rota que já teve alocação. */
    public function excluir(Rota $rota): void
    {
        $antes = $rota->toArray();
        $rota->delete();
        $this->audit->record('transporte', 'rota.excluida', "rota:{$rota->id}", $antes, null);
    }

    private function conferirEmpresa(?int $empresaId): void
    {
        if ($empresaId === null) {
            return;
        }
        $empresa = Empresa::query()->with('pessoa')->find($empresaId);
        if ($empresa === null) {
            throw new DomainException('Empresa não encontrada.');
        }
        $this->recusarSeContratoVencido($empresa);
    }

    private function conferirVeiculo(?int $veiculoId): void
    {
        if ($veiculoId === null) {
            return;
        }
        $veiculo = Veiculo::query()->with('empresa.pessoa')->withMax('vistorias', 'validade')->find($veiculoId);
        if ($veiculo === null) {
            throw new DomainException('Veículo não encontrado.');
        }
        $motivos = $veiculo->motivosIrregularidade();
        $rotulo = "Veículo {$veiculo->placa}";
        $validade = $veiculo->validadeDaVistoria()?->format('d/m/Y');
        if (in_array('inativo', $motivos, true)) {
            throw new ConflitoException("{$rotulo} está inativo.");
        }
        if (in_array('sem_vistoria', $motivos, true)) {
            throw new ConflitoException("{$rotulo} não tem vistoria do DETRAN registrada.");
        }
        if (in_array('vistoria_vencida', $motivos, true)) {
            throw new ConflitoException("{$rotulo} está com a vistoria vencida em {$validade}.");
        }
        if (in_array('contrato_vencido', $motivos, true) && $veiculo->empresa !== null) {
            $this->recusarSeContratoVencido($veiculo->empresa);
        }
    }

    private function conferirMotorista(?int $motoristaId): void
    {
        if ($motoristaId === null) {
            return;
        }
        $motorista = Motorista::query()->with('pessoa')->find($motoristaId);
        if ($motorista === null) {
            throw new DomainException('Motorista não encontrado.');
        }
        if (!$motorista->ativo) {
            throw new ConflitoException("Motorista {$motorista->nome()} está inativo.");
        }
        $motivos = $motorista->motivosInelegibilidade();
        if ($motivos !== []) {
            throw new ConflitoException("Motorista {$motorista->nome()} está inelegível: " . implode(', ', $motivos) . '.');
        }
    }

    private function recusarSeContratoVencido(Empresa $empresa): void
    {
        if ($empresa->contratoVencido()) {
            throw new ConflitoException("O contrato da {$empresa->tipoEnum()->label()} {$empresa->nome()} venceu em {$empresa->vigencia_fim->format('d/m/Y')}.");
        }
    }
}

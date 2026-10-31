<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Enums\OrigemVeiculo;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Support\ConflitoException;

final class VeiculoService
{
    /** Placa no formato antigo (ABC1234) ou Mercosul (ABC1D23). */
    private const PADRAO_PLACA = '/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/';

    public function __construct(private readonly AuditLogger $audit) {}

    public static function normalizarPlaca(string $placa): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $placa));
    }

    /** @param array<string, mixed> $dados */
    public function salvar(?Veiculo $veiculo, array $dados): Veiculo
    {
        return DB::transaction(function () use ($veiculo, $dados): Veiculo {
            $antes = $veiculo?->toArray();
            $placa = self::normalizarPlaca((string) $dados['placa']);
            if (preg_match(self::PADRAO_PLACA, $placa) !== 1) {
                throw new DomainException('Placa inválida: use o formato antigo (ABC1234) ou Mercosul (ABC1D23).');
            }

            $origem = OrigemVeiculo::from((string) $dados['origem']);
            $empresaId = $dados['empresa_id'] ?? null;
            $this->conferirOrigemEEmpresa($origem, $empresaId);

            $ativo = $dados['ativo'] ?? true;
            $motivo = isset($dados['motivo_inativacao']) ? trim((string) $dados['motivo_inativacao']) : '';
            if (!$ativo && $motivo === '') {
                throw new DomainException('Informe o motivo da inativação do veículo.');
            }

            $duplicada = Veiculo::query()->where('placa', $placa)
                ->when($veiculo, fn ($q) => $q->whereKeyNot($veiculo->id))->exists();
            if ($duplicada) {
                throw new ConflitoException('Já existe um veículo com essa placa.');
            }

            $campos = [
                'origem' => $origem->value,
                'empresa_id' => $origem === OrigemVeiculo::Propria ? null : $empresaId,
                'motorista_padrao_id' => $dados['motorista_padrao_id'] ?? null,
                'descricao' => $dados['descricao'],
                'placa' => $placa,
                'renavam' => $dados['renavam'] ?? null,
                'chassi' => $dados['chassi'] ?? null,
                'marca_modelo' => $dados['marca_modelo'] ?? null,
                'ano_fabricacao' => $dados['ano_fabricacao'] ?? null,
                'ano_modelo' => $dados['ano_modelo'] ?? null,
                'data_licenca' => $dados['data_licenca'] ?? null,
                'capacidade' => $dados['capacidade'],
                'tipo_rede' => $dados['tipo_rede'],
                'tipologia_inep' => $dados['tipologia_inep'],
                'uso_exclusivo' => $dados['uso_exclusivo'] ?? true,
                'acessivel' => $dados['acessivel'] ?? false,
                'ativo' => $ativo,
                'motivo_inativacao' => $ativo ? null : $motivo,
                'observacoes' => $dados['observacoes'] ?? null,
            ];

            $veiculo = $veiculo === null ? Veiculo::create($campos) : tap($veiculo)->update($campos);
            $this->audit->record('transporte', $antes === null ? 'veiculo.criado' : 'veiculo.alterado', "veiculo:{$veiculo->id}", $antes, $veiculo->toArray());

            return $veiculo;
        });
    }

    /** Exclusão lógica; a placa fica livre para um novo cadastro. As Fases 2 e 3 bloqueiam veículo em uso por rota. */
    public function excluir(Veiculo $veiculo): void
    {
        $antes = $veiculo->toArray();
        $veiculo->forceFill(['placa' => substr($veiculo->placa, 0, 12) . '#' . $veiculo->id])->save();
        $veiculo->delete();
        $this->audit->record('transporte', 'veiculo.excluido', "veiculo:{$veiculo->id}", $antes, null);
    }

    private function conferirOrigemEEmpresa(OrigemVeiculo $origem, mixed $empresaId): void
    {
        $exigida = $origem->empresaExigida();
        if ($exigida === null) {
            if ($empresaId !== null) {
                throw new DomainException('Veículo próprio não tem empresa.');
            }

            return;
        }
        if ($empresaId === null) {
            throw new DomainException("Veículo {$origem->label()} exige uma empresa {$exigida->label()}.");
        }
        $empresa = Empresa::query()->find($empresaId);
        if ($empresa === null || $empresa->tipoEnum() !== $exigida) {
            throw new DomainException("Veículo {$origem->label()} exige uma empresa {$exigida->label()}.");
        }
    }
}

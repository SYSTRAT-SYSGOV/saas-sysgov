<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\Material;
use Modules\Campanha\Models\Remessa;
use Modules\Campanha\Services\Concerns\RegistraMutacao;

/**
 * Materiais, estoque e remessas da campanha de trabalho (D2) e a despesa automática no livro-caixa (D3).
 * O estoque é calculado (produzida − remessas); registrar remessa trava o material para não vender o mesmo saldo duas vezes.
 */
final class MaterialService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
        private readonly MunicipioService $municipios,
        private readonly FinanceiroService $financeiro,
    ) {}

    /** @param array<string, mixed> $dados */
    public function salvar(?Material $material, array $dados, bool $lancarDespesa, ?User $autor): Material
    {
        if ($lancarDespesa && ($autor === null || !$autor->hasPermission('campanha.financeiro.manage', $this->tenant->id()))) {
            throw new DomainException('Lançar a despesa no financeiro exige a permissão do financeiro.');
        }
        if ($material !== null && isset($dados['quantidade_produzida']) && (int) $dados['quantidade_produzida'] < $material->totalEnviado()) {
            throw new DomainException('A quantidade produzida não pode ficar abaixo do que já foi enviado (' . $material->totalEnviado() . ').');
        }

        return DB::transaction(function () use ($material, $dados, $lancarDespesa): Material {
            $antes = $material?->toArray();
            $material ??= new Material();
            $material->fill($dados)->save();
            $this->auditar('material', $antes === null ? 'criado' : 'atualizado', $material->id, $antes, $material->toArray());
            if ($lancarDespesa && $material->valor_total_centavos > 0) {
                $this->financeiro->salvar(null, [
                    'tipo' => 'despesa', 'categoria' => 'publicidade_grafica', 'valor_centavos' => $material->valor_total_centavos,
                    'data' => today()->toDateString(), 'forma_pagamento' => 'transferencia', 'contraparte_nome' => $material->fornecedor,
                    'material_id' => $material->id, 'observacoes' => "Produção de {$material->quantidade_produzida} {$material->unidade} — {$material->nome}",
                ]);
            }

            return $material;
        });
    }

    public function excluir(Material $material): void
    {
        DB::transaction(function () use ($material): void {
            $antes = $material->toArray();
            $material->delete();
            $this->auditar('material', 'excluido', $material->id, $antes, null);
        });
    }

    /** @param array<string, mixed> $dados */
    public function salvarRemessa(?Remessa $remessa, array $dados): Remessa
    {
        if (isset($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if (!empty($dados['coordenador_id']) && !Coordenador::query()->whereKey((int) $dados['coordenador_id'])->exists()) {
            throw new DomainException('Coordenador não encontrado nesta campanha.');
        }
        if (!empty($dados['cabo_id']) && !CaboEleitoral::query()->whereKey((int) $dados['cabo_id'])->exists()) {
            throw new DomainException('Cabo eleitoral não encontrado nesta campanha.');
        }

        return DB::transaction(function () use ($remessa, $dados): Remessa {
            $materialId = (int) ($dados['material_id'] ?? $remessa?->material_id);
            $material = Material::query()->lockForUpdate()->find($materialId) ?? throw new DomainException('Material não encontrado nesta campanha.');
            $quantidade = (int) ($dados['quantidade'] ?? $remessa?->quantidade);
            // Na edição, a quantidade atual da remessa volta ao saldo antes de conferir.
            $disponivel = $material->estoque() + ($remessa !== null && $remessa->material_id === $material->id ? $remessa->quantidade : 0);
            if ($quantidade > $disponivel) {
                throw new DomainException("Estoque insuficiente: há {$disponivel} {$material->unidade} de {$material->nome}.");
            }
            $antes = $remessa?->toArray();
            $remessa ??= new Remessa();
            $remessa->fill($dados)->save();
            $this->auditar('remessa', $antes === null ? 'registrada' : 'atualizada', $remessa->id, $antes, $remessa->toArray(), ['material_id' => $material->id]);

            return $remessa;
        });
    }

    /** Excluir a remessa devolve a quantidade ao estoque (o estoque é calculado). */
    public function excluirRemessa(Remessa $remessa): void
    {
        DB::transaction(function () use ($remessa): void {
            $antes = $remessa->toArray();
            $remessa->delete();
            $this->auditar('remessa', 'excluida', $remessa->id, $antes, null, ['material_id' => $remessa->material_id]);
        });
    }
}

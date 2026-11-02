<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;
use Modules\Transporte\Manutencao\Catalogo;
use Modules\Transporte\Models\Fornecedor;
use Modules\Transporte\Support\ConflitoException;

/** Fornecedor da frota nasce de uma pessoa jurídica do Cadastro de Pessoas, como a empresa (design D-M1, D-M2). */
final class FornecedorService
{
    public function __construct(private readonly ResolucaoPessoaService $pessoas, private readonly AuditLogger $audit) {}

    /**
     * @param array{pessoa_id?: int|null, cnpj?: string|null, razao_social?: string|null, nome_fantasia?: string|null, ramos: list<string>, contato?: string|null, ativo?: bool, observacoes?: string|null} $dados
     */
    public function salvar(?Fornecedor $fornecedor, array $dados): Fornecedor
    {
        $ramos = array_values(array_unique($dados['ramos']));
        if ($ramos === [] || array_diff($ramos, array_keys(Catalogo::RAMOS)) !== []) {
            throw new DomainException('Informe ao menos um ramo válido: ' . implode(', ', array_values(Catalogo::RAMOS)) . '.');
        }

        return DB::transaction(function () use ($fornecedor, $dados, $ramos): Fornecedor {
            $antes = $fornecedor?->toArray();
            $campos = [
                'ramos' => $ramos, 'contato' => $dados['contato'] ?? null, 'ativo' => $dados['ativo'] ?? true, 'observacoes' => $dados['observacoes'] ?? null,
            ];

            if ($fornecedor === null) {
                $pessoa = $this->pessoaJuridica($dados);
                $existente = Fornecedor::withTrashed()->where('pessoa_id', $pessoa->id)->first();
                if ($existente !== null && !$existente->trashed()) {
                    throw new ConflitoException('Essa pessoa jurídica já é fornecedora da frota.');
                }
                if ($existente !== null) {
                    $existente->restore();
                    $existente->update($campos);
                    $fornecedor = $existente;
                } else {
                    $fornecedor = Fornecedor::create([...$campos, 'pessoa_id' => $pessoa->id]);
                }
            } else {
                $fornecedor->update($campos);
            }

            $this->audit->record('transporte', $antes === null ? 'fornecedor.criado' : 'fornecedor.alterado', "fornecedor:{$fornecedor->id}", $antes, $fornecedor->toArray());

            return $fornecedor;
        });
    }

    /** Fornecedor com ordem de serviço não é excluído: é inativado (design D-M2). */
    public function excluir(Fornecedor $fornecedor): void
    {
        if ($fornecedor->ordens()->exists()) {
            throw new ConflitoException('O fornecedor tem ordens de serviço; inative-o em vez de excluir.');
        }
        $antes = $fornecedor->toArray();
        $fornecedor->delete();
        $this->audit->record('transporte', 'fornecedor.excluido', "fornecedor:{$fornecedor->id}", $antes, null);
    }

    /** @param array<string, mixed> $dados */
    private function pessoaJuridica(array $dados): Pessoa
    {
        if (!empty($dados['pessoa_id'])) {
            $pessoa = Pessoa::query()->find($dados['pessoa_id']) ?? throw new DomainException('Pessoa não encontrada.');
            if ($pessoa->tipo !== 'juridica') {
                throw new DomainException('O fornecedor deve ser uma pessoa jurídica.');
            }

            return $pessoa;
        }

        return $this->pessoas->resolverPorCnpj(Documento::somenteDigitos((string) ($dados['cnpj'] ?? '')), (string) ($dados['razao_social'] ?? ''), $dados['nome_fantasia'] ?? null, 'transporte');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Support\ConflitoException;

/** Empresa nasce de uma pessoa jurídica do Cadastro de Pessoas (D4), resolvida pelo CNPJ ou escolhida pelo id. */
final class EmpresaService
{
    public function __construct(
        private readonly ResolucaoPessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{pessoa_id?: int|null, cnpj?: string|null, razao_social?: string|null, nome_fantasia?: string|null, tipo: string, contrato_numero: string, vigencia_inicio: string, vigencia_fim: string, ativa?: bool, observacoes?: string|null} $dados
     */
    public function salvar(?Empresa $empresa, array $dados): Empresa
    {
        return DB::transaction(function () use ($empresa, $dados): Empresa {
            $antes = $empresa?->toArray();
            $campos = [
                'tipo' => $dados['tipo'],
                'contrato_numero' => $dados['contrato_numero'],
                'vigencia_inicio' => $dados['vigencia_inicio'],
                'vigencia_fim' => $dados['vigencia_fim'],
                'ativa' => $dados['ativa'] ?? true,
                'observacoes' => $dados['observacoes'] ?? null,
            ];

            if ($empresa === null) {
                $pessoa = $this->pessoaJuridica($dados);
                $existente = Empresa::withTrashed()->where('pessoa_id', $pessoa->id)->first();
                if ($existente !== null && !$existente->trashed()) {
                    throw new ConflitoException('Essa pessoa jurídica já é empresa de transporte.');
                }
                if ($existente !== null) {
                    $existente->restore();
                    $existente->update($campos);
                    $empresa = $existente;
                } else {
                    $empresa = Empresa::create([...$campos, 'pessoa_id' => $pessoa->id]);
                }
            } else {
                $empresa->update($campos);
            }

            $this->audit->record('transporte', $antes === null ? 'empresa.criada' : 'empresa.alterada', "empresa:{$empresa->id}", $antes, $empresa->toArray());

            return $empresa;
        });
    }

    /** Empresa com veículos não é excluída: é inativada (D: histórico sem perda). */
    public function excluir(Empresa $empresa): void
    {
        if ($empresa->veiculos()->exists()) {
            throw new ConflitoException('A empresa tem veículos cadastrados; inative-a em vez de excluir.');
        }
        $antes = $empresa->toArray();
        $empresa->delete();
        $this->audit->record('transporte', 'empresa.excluida', "empresa:{$empresa->id}", $antes, null);
    }

    /** @param array<string, mixed> $dados */
    private function pessoaJuridica(array $dados): Pessoa
    {
        if (!empty($dados['pessoa_id'])) {
            $pessoa = Pessoa::query()->find($dados['pessoa_id']);
            if ($pessoa === null) {
                throw new DomainException('Pessoa não encontrada.');
            }
            if ($pessoa->tipo !== 'juridica') {
                throw new DomainException('A empresa deve ser uma pessoa jurídica.');
            }

            return $pessoa;
        }

        $cnpj = Documento::somenteDigitos((string) ($dados['cnpj'] ?? ''));

        return $this->pessoas->resolverPorCnpj($cnpj, (string) ($dados['razao_social'] ?? ''), $dados['nome_fantasia'] ?? null, 'transporte');
    }
}

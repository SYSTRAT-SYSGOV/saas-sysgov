<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;

/** Profissional nasce de uma pessoa do Cadastro de Pessoas, resolvida pelo CPF (D2); usuário é opcional (D3). */
final class ProfissionalService
{
    public function __construct(
        private readonly ResolucaoPessoaService $pessoas,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{cpf?: string, nome?: string, cargo_id: int, user_id?: int|null, registro_profissional?: string|null, telefone?: string|null, ativo?: bool} $dados
     */
    public function salvar(?Profissional $profissional, array $dados): Profissional
    {
        return DB::transaction(function () use ($profissional, $dados): Profissional {
            $antes = $profissional?->toArray();
            $campos = [
                'cargo_id' => $dados['cargo_id'],
                'user_id' => $dados['user_id'] ?? null,
                'registro_profissional' => $dados['registro_profissional'] ?? null,
                'telefone' => $dados['telefone'] ?? null,
                'ativo' => $dados['ativo'] ?? true,
            ];

            if ($campos['user_id'] !== null && Profissional::query()->where('user_id', $campos['user_id'])->when($profissional, fn ($q) => $q->whereKeyNot($profissional->id))->exists()) {
                throw new DomainException('Esse usuário já está ligado a outro profissional.');
            }

            if ($profissional === null) {
                $cpf = Documento::somenteDigitos((string) ($dados['cpf'] ?? ''));
                $pessoa = $this->pessoas->resolverPorCpf($cpf, ['nome' => (string) ($dados['nome'] ?? '')], 'multiprofissional');
                if (Profissional::query()->where('pessoa_id', $pessoa->id)->exists()) {
                    throw new DomainException('Já existe um profissional com esse CPF.');
                }
                $profissional = Profissional::create([
                    ...$campos,
                    'pessoa_id' => $pessoa->id,
                    'nome' => $pessoa->nome_social ?: $pessoa->nome,
                    'cpf_mascarado' => Documento::mascarar($cpf),
                ]);
            } else {
                $profissional->update($campos);
            }

            $this->audit->record('multiprofissional', $antes === null ? 'profissional.criado' : 'profissional.alterado', "profissional:{$profissional->id}", $antes, $profissional->toArray());

            return $profissional;
        });
    }

    /** Profissional que já atendeu é desativado, não excluído. */
    public function excluir(Profissional $profissional): bool
    {
        $usado = DB::table('multi_atendimento_profissionais')->where('profissional_id', $profissional->id)->exists();
        if ($usado) {
            $profissional->update(['ativo' => false]);
            $this->audit->record('multiprofissional', 'profissional.desativado', "profissional:{$profissional->id}", null, ['nome' => $profissional->nome]);

            return false;
        }
        $antes = $profissional->toArray();
        $profissional->delete();
        $this->audit->record('multiprofissional', 'profissional.excluido', "profissional:{$profissional->id}", $antes, null);

        return true;
    }
}

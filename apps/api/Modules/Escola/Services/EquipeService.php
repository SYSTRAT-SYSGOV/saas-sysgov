<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Turma;
use Modules\Escola\Services\Concerns\RegistraMutacao;
use Modules\Pessoas\Models\Pessoa;

/** Equipe gestora da unidade (D17): um diretor, vários auxiliares, secretaria e pedagogas. */
final class EquipeService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @return Collection<int, MembroEquipe> */
    public function listar(): Collection
    {
        $ordemCargo = "CASE cargo WHEN 'diretor' THEN 0 WHEN 'diretor_auxiliar' THEN 1 WHEN 'secretaria' THEN 2 ELSE 3 END";

        return MembroEquipe::query()->orderByRaw($ordemCargo)->orderBy('ordem')->orderBy('nome')->get();
    }

    /** @param array{nome: string, cargo: string, ordem?: int} $dados */
    public function criar(array $dados): MembroEquipe
    {
        return DB::transaction(function () use ($dados): MembroEquipe {
            $this->garantirDiretorUnico($dados['cargo']);
            $membro = MembroEquipe::create($this->comNomeDaPessoa($dados));
            $this->auditar('equipe', 'criada', $membro->id, null, $membro->toArray());

            return $membro;
        });
    }

    /** @param array{nome?: string, cargo?: string, ordem?: int} $dados */
    public function atualizar(MembroEquipe $membro, array $dados): MembroEquipe
    {
        return DB::transaction(function () use ($membro, $dados): MembroEquipe {
            if (isset($dados['cargo'])) {
                $this->garantirDiretorUnico($dados['cargo'], $membro->id);
            }
            $antes = $membro->toArray();
            $membro->update($this->comNomeDaPessoa($dados));
            if ($membro->cargo !== 'pedagoga') {
                $this->desvincularTurmas($membro);
            }
            $this->auditar('equipe', 'atualizada', $membro->id, $antes, $membro->toArray());

            return $membro;
        });
    }

    /** Nome exibido nas atas: o da pessoa, quando o membro foi escolhido no Cadastro de Pessoas. */
    public function atualizarNomesDaPessoa(int $pessoaId, int $tenantId): void
    {
        $nome = Pessoa::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereKey($pessoaId)->value('nome');
        if ($nome !== null) {
            MembroEquipe::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('pessoa_id', $pessoaId)->update(['nome' => $nome]);
        }
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function comNomeDaPessoa(array $dados): array
    {
        if (!empty($dados['pessoa_id'])) {
            $dados['nome'] = (string) Pessoa::query()->whereKey((int) $dados['pessoa_id'])->value('nome');
        }

        return $dados;
    }

    public function excluir(MembroEquipe $membro): void
    {
        DB::transaction(function () use ($membro): void {
            $antes = $membro->toArray();
            $this->desvincularTurmas($membro);
            $membro->delete();
            $this->auditar('equipe', 'excluida', $membro->id, $antes, null);
        });
    }

    /** Quem deixa de ser pedagoga (exclusão ou troca de cargo) sai das turmas em que era a pedagoga. */
    private function desvincularTurmas(MembroEquipe $membro): void
    {
        Turma::query()->where('pedagoga_id', $membro->id)->update(['pedagoga_id' => null]);
    }

    private function garantirDiretorUnico(string $cargo, ?int $ignorarId = null): void
    {
        if ($cargo !== 'diretor') {
            return;
        }
        $existe = MembroEquipe::query()->where('cargo', 'diretor')
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()->exists();
        if ($existe) {
            throw ValidationException::withMessages(['cargo' => 'Já existe um diretor cadastrado; cadastre os demais como diretor auxiliar.']);
        }
    }
}

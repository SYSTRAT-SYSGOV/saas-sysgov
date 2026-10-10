<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Services\Concerns\RegistraMutacao;

final class TurmaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array{nome: string, turno_id: int, ano_letivo: int, pedagoga_id?: int|null} $dados */
    public function criar(array $dados): Turma
    {
        return DB::transaction(function () use ($dados): Turma {
            $this->garantirNomeLivre(trim($dados['nome']), (int) $dados['turno_id'], (int) $dados['ano_letivo']);
            $turma = Turma::create([...$dados, 'nome' => trim($dados['nome'])]);
            $this->auditar('turma', 'criada', $turma->id, null, $turma->toArray());

            return $turma;
        });
    }

    /** @param array{nome?: string, turno_id?: int, ano_letivo?: int, pedagoga_id?: int|null} $dados */
    public function atualizar(Turma $turma, array $dados): Turma
    {
        return DB::transaction(function () use ($turma, $dados): Turma {
            $nome = trim($dados['nome'] ?? $turma->nome);
            $this->garantirNomeLivre($nome, (int) ($dados['turno_id'] ?? $turma->turno_id), (int) ($dados['ano_letivo'] ?? $turma->ano_letivo), $turma->id);
            $antes = $turma->toArray();
            $turma->update([...$dados, 'nome' => $nome]);
            $this->auditar('turma', 'atualizada', $turma->id, $antes, $turma->toArray());

            return $turma;
        });
    }

    /** Exclusão lógica; os alunos continuam cadastrados, sem turma. */
    public function excluir(Turma $turma): void
    {
        DB::transaction(function () use ($turma): void {
            $antes = $turma->toArray();
            $alunos = Aluno::query()->where('turma_id', $turma->id)->update(['turma_id' => null]);
            $turma->delete();
            $this->auditar('turma', 'excluida', $turma->id, $antes, null, ['alunos_sem_turma' => $alunos]);
        });
    }

    /** Nova turma "<nome> (Cópia)" com o mesmo turno, ano, pedagoga e vínculos de matérias/professores, sem alunos. */
    public function duplicar(Turma $origem): Turma
    {
        return DB::transaction(function () use ($origem): Turma {
            $nome = "{$origem->nome} (Cópia)";
            for ($n = 2; $this->nomeEmUso($nome, $origem->turno_id, $origem->ano_letivo); $n++) {
                $nome = "{$origem->nome} (Cópia {$n})";
            }
            $copia = Turma::create(['nome' => $nome, 'turno_id' => $origem->turno_id, 'pedagoga_id' => $origem->pedagoga_id, 'ano_letivo' => $origem->ano_letivo]);
            foreach ($origem->vinculos()->get() as $vinculo) {
                TurmaMateria::create([
                    'turma_id' => $copia->id,
                    'materia_id' => $vinculo->materia_id,
                    'professor_user_id' => $vinculo->professor_user_id,
                ]);
            }
            $this->auditar('turma', 'duplicada', $copia->id, null, $copia->toArray(), ['origem_id' => $origem->id]);

            return $copia->load('vinculos');
        });
    }

    /**
     * Substitui os vínculos da turma pelo conjunto informado.
     *
     * @param list<array{materia_id: int, professor_user_id?: int|null}> $vinculos
     */
    public function sincronizarMaterias(Turma $turma, array $vinculos): Turma
    {
        return DB::transaction(function () use ($turma, $vinculos): Turma {
            $antes = $turma->vinculos()->get(['materia_id', 'professor_user_id'])->toArray();
            $turma->vinculos()->delete();
            foreach ($vinculos as $vinculo) {
                TurmaMateria::create([
                    'turma_id' => $turma->id,
                    'materia_id' => $vinculo['materia_id'],
                    'professor_user_id' => $vinculo['professor_user_id'] ?? null,
                ]);
            }
            $depois = $turma->vinculos()->get(['materia_id', 'professor_user_id'])->toArray();
            $this->auditar('turma', 'materias_sincronizadas', $turma->id, ['vinculos' => $antes], ['vinculos' => $depois]);

            return $turma->load('vinculos.materia', 'vinculos.professor:id,name');
        });
    }

    private function garantirNomeLivre(string $nome, int $turnoId, int $ano, ?int $ignorarId = null): void
    {
        if ($this->nomeEmUso($nome, $turnoId, $ano, $ignorarId)) {
            throw ValidationException::withMessages(['nome' => "Já existe a turma \"{$nome}\" neste turno em {$ano}."]);
        }
    }

    private function nomeEmUso(string $nome, int $turnoId, int $ano, ?int $ignorarId = null): bool
    {
        return Turma::query()
            ->where('turno_id', $turnoId)
            ->where('ano_letivo', $ano)
            ->where('nome', $nome)
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
    }
}

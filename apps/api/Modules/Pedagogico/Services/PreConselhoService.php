<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\TurmaMateria;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Models\PreConselhoAluno;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class PreConselhoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Cria ou atualiza a ficha da turma × matéria × período × ano (uma por combinação). Os alunos avaliados
     * são identificados pelo id: o texto de um aluno nunca "sobe" para outro, mesmo com alunos sem texto no meio.
     *
     * @param array<string, mixed> $dados
     * @param list<array{aluno_id: int, nivel_atencao: string, dificuldade?: string|null, encaminhamentos?: string|null, destaque?: bool}> $alunos
     */
    public function salvar(array $dados, array $alunos, User $user): PreConselho
    {
        return DB::transaction(function () use ($dados, $alunos, $user): PreConselho {
            $chave = ['turma_id' => $dados['turma_id'], 'materia_id' => $dados['materia_id'], 'ano_letivo' => $dados['ano_letivo'], 'periodo' => $dados['periodo']];
            $ficha = PreConselho::query()->where($chave)->lockForUpdate()->first();
            $antes = $ficha === null ? null : [...$ficha->toArray(), 'alunos' => $ficha->alunos()->get()->toArray()];

            $campos = array_intersect_key($dados, array_flip(PreConselho::CAMPOS_FICHA));
            if ($ficha === null) {
                $ficha = PreConselho::create([...$chave, ...$campos, 'registrado_por' => $user->id]);
            } else {
                $ficha->update([...$campos, 'registrado_por' => $user->id]);
            }

            $ficha->alunos()->delete();
            foreach ($alunos as $aluno) {
                PreConselhoAluno::create([
                    'pre_conselho_id' => $ficha->id,
                    'aluno_id' => $aluno['aluno_id'],
                    'nivel_atencao' => $aluno['nivel_atencao'],
                    'dificuldade' => $aluno['dificuldade'] ?? null,
                    'encaminhamentos' => $aluno['encaminhamentos'] ?? null,
                    'destaque' => (bool) ($aluno['destaque'] ?? false),
                ]);
            }

            $depois = [...$ficha->toArray(), 'alunos' => $ficha->alunos()->get()->toArray()];
            $this->auditar('pre_conselho', 'salvo', $ficha->id, $antes, $depois, $chave);

            return $ficha->load('alunos.aluno', 'turma', 'materia');
        });
    }

    public function excluir(PreConselho $ficha): void
    {
        DB::transaction(function () use ($ficha): void {
            $antes = $ficha->toArray();
            $ficha->delete();
            $this->auditar('pre_conselho', 'excluido', $ficha->id, $antes, null);
        });
    }

    /**
     * Progresso por turma: matérias vinculadas com ficha entregue no período / total de matérias vinculadas.
     *
     * @param list<int>|null $turmaIds null = todas
     * @return Collection<int, array{turma_id: int, entregues: int<0, max>, total: int<0, max>}>
     */
    public function progresso(int $anoLetivo, int $periodo, ?array $turmaIds = null): Collection
    {
        $vinculos = TurmaMateria::query()
            ->when($turmaIds !== null, fn ($q) => $q->whereIn('turma_id', $turmaIds))
            ->get(['turma_id', 'materia_id'])
            ->groupBy('turma_id');
        $fichas = PreConselho::query()
            ->where('ano_letivo', $anoLetivo)
            ->where('periodo', $periodo)
            ->when($turmaIds !== null, fn ($q) => $q->whereIn('turma_id', $turmaIds))
            ->get(['turma_id', 'materia_id'])
            ->groupBy('turma_id');

        return $vinculos->map(function (Collection $daTurma, int $turmaId) use ($fichas): array {
            $materias = $daTurma->pluck('materia_id')->unique();
            $entregues = ($fichas->get($turmaId) ?? collect())->pluck('materia_id')->unique()->intersect($materias)->count();

            return ['turma_id' => $turmaId, 'entregues' => $entregues, 'total' => $materias->count()];
        })->values();
    }
}

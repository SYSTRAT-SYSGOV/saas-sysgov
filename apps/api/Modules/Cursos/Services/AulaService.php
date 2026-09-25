<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Presenca;

/** Aulas são o conteúdo do curso; o agendamento por turma fica no TurmaService. */
final class AulaService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{titulo: string, descricao?: string|null, duracao_minutos: int, ordem?: int} $dados
     */
    public function criar(Curso $curso, array $dados): Aula
    {
        $this->garantirCursoEditavel($curso);

        return DB::transaction(function () use ($curso, $dados): Aula {
            $aula = $curso->aulas()->create([
                ...$dados,
                'ordem' => $dados['ordem'] ?? ((int) $curso->aulas()->max('ordem')) + 1,
            ]);

            $this->audit->record('cursos', 'aula.criada', "Aula #{$aula->id}", null, $aula->toArray());

            return $aula;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Aula $aula, array $dados): Aula
    {
        $this->garantirCursoEditavel($aula->curso);

        return DB::transaction(function () use ($aula, $dados): Aula {
            $antes = $aula->toArray();
            $aula->update($dados);
            $this->audit->record('cursos', 'aula.atualizada', "Aula #{$aula->id}", $antes, $aula->toArray());

            return $aula;
        });
    }

    public function excluir(Aula $aula): void
    {
        $this->garantirCursoEditavel($aula->curso);

        // A exclusão levaria junto (cascade) os agendamentos e as presenças já
        // registradas — apagaria histórico de frequência.
        if (Presenca::query()->whereIn('agendamento_id', $aula->agendamentos()->select('id'))->exists()) {
            throw new DomainException('Esta aula já tem presenças registradas e não pode ser excluída.');
        }

        DB::transaction(function () use ($aula): void {
            $antes = $aula->toArray();
            $aula->delete();
            $this->audit->record('cursos', 'aula.excluida', "Aula #{$antes['id']}", $antes, null);
        });
    }

    private function garantirCursoEditavel(Curso $curso): void
    {
        if ($curso->statusEnum()->is(StatusCurso::Encerrado)) {
            throw new DomainException('Curso encerrado não pode ter as aulas alteradas.');
        }
    }
}

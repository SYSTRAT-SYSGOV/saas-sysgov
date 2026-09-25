<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Curso;

final class CursoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * @param array{tipo?: string, titulo: string, descricao?: string|null, carga_horaria_minutos: int, frequencia_minima?: int, modelo_certificado_id?: int|null} $dados
     */
    public function criar(array $dados, User $user): Curso
    {
        return DB::transaction(function () use ($dados, $user): Curso {
            $curso = Curso::create([
                ...$dados,
                'tipo' => $dados['tipo'] ?? TipoCurso::Curso->value,
                'status' => StatusCurso::Rascunho->value,
                'criado_por' => $user->id,
            ])->refresh();

            $this->audit->record('cursos', 'curso.criado', "Curso #{$curso->id}", null, $curso->toArray());
            $this->outbox->publish('cursos.CursoCriado', ['id' => $curso->id, 'tipo' => $curso->tipo]);

            return $curso;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Curso $curso, array $dados): Curso
    {
        if ($curso->statusEnum()->is(StatusCurso::Encerrado)) {
            throw new DomainException('Curso encerrado não pode ser alterado.');
        }

        if (($dados['tipo'] ?? null) === TipoCurso::Evento->value && $this->turmasNaoCanceladas($curso) > 1) {
            throw new DomainException('Este curso tem mais de uma turma e não pode virar evento — eventos têm turma única.');
        }

        return DB::transaction(function () use ($curso, $dados): Curso {
            $antes = $curso->toArray();
            $curso->update($dados);

            $this->audit->record('cursos', 'curso.atualizado', "Curso #{$curso->id}", $antes, $curso->toArray());

            return $curso;
        });
    }

    public function alterarStatus(Curso $curso, StatusCurso $novo): Curso
    {
        if (!$curso->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida de "%s" para "%s".', $curso->statusEnum()->label(), $novo->label()));
        }

        return DB::transaction(function () use ($curso, $novo): Curso {
            $antes = $curso->status;
            $curso->update(['status' => $novo->value]);

            $this->audit->record('cursos', 'curso.status_alterado', "Curso #{$curso->id}", ['status' => $antes], ['status' => $novo->value]);
            $this->outbox->publish('cursos.CursoStatusAlterado', ['id' => $curso->id, 'status' => $novo->value]);

            return $curso;
        });
    }

    public function excluir(Curso $curso): void
    {
        if ($curso->inscricoes()->exists()) {
            throw new DomainException('Este curso tem inscrições e não pode ser excluído. Encerre o curso em vez de excluí-lo.');
        }

        DB::transaction(function () use ($curso): void {
            $antes = $curso->toArray();
            $capa = $curso->capa_path;
            $curso->delete();

            if ($capa !== null) {
                Storage::disk('public')->delete($capa);
            }

            $this->audit->record('cursos', 'curso.excluido', "Curso #{$antes['id']}", $antes, null);
            $this->outbox->publish('cursos.CursoExcluido', ['id' => $antes['id']]);
        });
    }

    public function definirCapa(Curso $curso, UploadedFile $arquivo): Curso
    {
        $antes = $curso->capa_path;
        $caminho = $arquivo->storeAs(
            "cursos/{$curso->tenant_id}/capas",
            "curso-{$curso->id}-" . now()->format('YmdHis') . '.' . strtolower($arquivo->getClientOriginalExtension()),
            'public',
        );

        $curso->update(['capa_path' => $caminho]);
        if ($antes !== null && $antes !== $caminho) {
            Storage::disk('public')->delete($antes);
        }

        $this->audit->record('cursos', 'curso.capa_definida', "Curso #{$curso->id}", ['capa_path' => $antes], ['capa_path' => $caminho]);

        return $curso;
    }

    public function removerCapa(Curso $curso): Curso
    {
        $antes = $curso->capa_path;
        if ($antes === null) {
            return $curso;
        }

        $curso->update(['capa_path' => null]);
        Storage::disk('public')->delete($antes);
        $this->audit->record('cursos', 'curso.capa_removida', "Curso #{$curso->id}", ['capa_path' => $antes], ['capa_path' => null]);

        return $curso;
    }

    private function turmasNaoCanceladas(Curso $curso): int
    {
        return $curso->turmas()->where('status', '!=', StatusTurma::Cancelada->value)->count();
    }
}
